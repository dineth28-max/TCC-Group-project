using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Gives every active student without a RiskScore one, through the real AI model
/// (RiskScoringService) — so a freshly seeded or bulk-imported roster has a populated High-Risk
/// panel without anyone clicking "predict" 2,000 times. Scores are never fabricated: if the
/// ai-service container isn't reachable yet, this waits and retries rather than writing anything.
/// </summary>
public class RiskBackfillBackgroundService : BackgroundService
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RiskBackfillBackgroundService> _logger;

    public RiskBackfillBackgroundService(IServiceScopeFactory scopeFactory, ILogger<RiskBackfillBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the AI service container finish loading its model first.
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            List<int> pending;
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                pending = await db.Students.IgnoreQueryFilters()
                    .Where(s => s.Status == StudentStatus.Active && !db.RiskScores.IgnoreQueryFilters().Any(r => r.StudentId == s.Id))
                    .Select(s => s.Id)
                    .ToListAsync(stoppingToken);
            }

            if (pending.Count == 0) return;
            _logger.LogInformation("Risk backfill: scoring {Count} students without a risk score.", pending.Count);

            var scored = 0;
            var aiUnavailable = false;
            foreach (var chunk in pending.Chunk(100))
            {
                // Fresh scope per chunk keeps the change tracker small across thousands of students.
                using var scope = _scopeFactory.CreateScope();
                var scoring = scope.ServiceProvider.GetRequiredService<RiskScoringService>();
                foreach (var studentId in chunk)
                {
                    if (stoppingToken.IsCancellationRequested) return;
                    if (await scoring.RecomputeForStudent(studentId))
                    {
                        scored++;
                    }
                    else
                    {
                        aiUnavailable = true;
                        break;
                    }
                }
                if (aiUnavailable) break;
            }

            _logger.LogInformation("Risk backfill: {Scored}/{Total} students scored.", scored, pending.Count);
            if (!aiUnavailable) return;

            _logger.LogWarning("Risk backfill paused — AI service unavailable. Retrying in {Seconds}s.", RetryDelay.TotalSeconds);
            await Task.Delay(RetryDelay, stoppingToken);
        }
    }
}
