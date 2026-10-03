using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Keeps the AI risk engine ready without manual steps after `docker compose up`:
///  1. If the AI service is still running its synthetic bootstrap model, retrain it on this
///     system's real student records (features from attendance/fees/engagement, labelled by who
///     actually dropped out) — see RiskScoringService.TrainModelFromStudentRecords.
///  2. Score every active student that has no risk score yet (or all of them after a retrain).
/// Scores are never fabricated: if the ai-service container isn't reachable yet, this waits and
/// retries rather than writing anything.
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
            try
            {
                if (await RunOnce(stoppingToken)) return;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Risk engine startup run failed.");
            }

            _logger.LogWarning("Risk engine not ready yet (AI service unavailable). Retrying in {Seconds}s.", RetryDelay.TotalSeconds);
            await Task.Delay(RetryDelay, stoppingToken);
        }
    }

    /// <returns>true when done; false to retry later.</returns>
    private async Task<bool> RunOnce(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var aiClient = scope.ServiceProvider.GetRequiredService<AiRiskClient>();
        var scoring = scope.ServiceProvider.GetRequiredService<RiskScoringService>();

        var modelInfo = await aiClient.GetModelInfo();
        if (modelInfo is null) return false;

        var retrained = false;
        if (modelInfo.Source != "csmas")
        {
            var (model, error) = await scoring.TrainModelFromStudentRecords();
            if (model is null)
            {
                // Not enough labelled history yet (e.g. a brand-new institute) — keep using the
                // bootstrap model rather than blocking scoring forever.
                _logger.LogWarning("Could not train the risk model on CSMAS data: {Error}", error);
                if (error is not null && error.StartsWith("The AI service")) return false;
            }
            else
            {
                retrained = true;
                _logger.LogInformation(
                    "Risk model trained on {Rows} CSMAS students ({Dropouts} dropouts): accuracy {Accuracy:P1}, ROC-AUC {RocAuc:0.000}.",
                    model.TrainingRows, model.Dropouts, model.Accuracy, model.RocAuc);
            }
        }

        var query = db.Students.IgnoreQueryFilters().Where(s => s.Status == StudentStatus.Active);
        if (!retrained)
        {
            query = query.Where(s => !db.RiskScores.IgnoreQueryFilters().Any(r => r.StudentId == s.Id));
        }
        var pending = await query.Select(s => s.Id).ToListAsync(stoppingToken);
        if (pending.Count == 0) return true;

        _logger.LogInformation("Risk engine: scoring {Count} students with the trained model.", pending.Count);
        var scored = await scoring.RecomputeForStudents(pending);
        _logger.LogInformation("Risk engine: {Scored}/{Total} students scored.", scored, pending.Count);
        return scored == pending.Count;
    }
}
