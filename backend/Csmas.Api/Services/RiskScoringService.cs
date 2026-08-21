using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Orchestrates F7 (plan.md §14.6): build this student's features, ask the AI service's trained
/// model for a probability, turn that into a score/bucket/plain-language reasons, persist it, and
/// fire a RiskEscalation notification on a Medium→High crossing. Every call is wrapped by the
/// caller in try/catch — a failure here must never fail the attendance/payment action that
/// triggered it.
/// </summary>
public class RiskScoringService
{
    private readonly AppDbContext _db;
    private readonly RiskFeatureBuilder _featureBuilder;
    private readonly AiRiskClient _aiClient;
    private readonly NotificationQueueService _notifications;
    private readonly ILogger<RiskScoringService> _logger;

    public RiskScoringService(
        AppDbContext db,
        RiskFeatureBuilder featureBuilder,
        AiRiskClient aiClient,
        NotificationQueueService notifications,
        ILogger<RiskScoringService> logger)
    {
        _db = db;
        _featureBuilder = featureBuilder;
        _aiClient = aiClient;
        _notifications = notifications;
        _logger = logger;
    }

    /// <returns>true if a fresh score was computed and persisted; false if the student doesn't
    /// exist or the AI service was unreachable (any existing score, if any, is left untouched).</returns>
    public async Task<bool> RecomputeForStudent(int studentId)
    {
        var request = await _featureBuilder.BuildFeatures(studentId);
        if (request is null) return false;

        var prediction = await _aiClient.Predict(request);
        if (prediction is null)
        {
            _logger.LogWarning("Risk score for student {StudentId} left unchanged — AI service unavailable.", studentId);
            return false;
        }

        var score = (int)Math.Round(prediction.RiskProbability * 100);
        var level = score < 40 ? RiskLevel.Low : score < 70 ? RiskLevel.Medium : RiskLevel.High;
        var factors = TopFactors(request);

        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId);
        if (student is null) return false;

        var riskScore = await _db.RiskScores.FirstOrDefaultAsync(r => r.StudentId == studentId);
        var previousLevel = riskScore?.Level;

        if (riskScore is null)
        {
            riskScore = new RiskScore { InstituteId = student.InstituteId, StudentId = studentId };
            _db.RiskScores.Add(riskScore);
        }

        // Invariant: this is the only line in the codebase that assigns RiskScore.Score, and it is
        // only reachable once `prediction` (line 43) is a real, successful response from the AI
        // service's trained model — never a default/placeholder. If that call fails, this method
        // returns false above (line 47) before ever reaching here, and the caller must not persist
        // or display a score in that case.
        riskScore.PreviousLevel = previousLevel;
        riskScore.Score = score;
        riskScore.Level = level;
        riskScore.TopFactor1 = factors.ElementAtOrDefault(0);
        riskScore.TopFactor2 = factors.ElementAtOrDefault(1);
        riskScore.TopFactor3 = factors.ElementAtOrDefault(2);
        riskScore.ComputedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (previousLevel == RiskLevel.Medium && level == RiskLevel.High)
        {
            var branchAdminIds = await _db.Users
                .Where(u => u.Role == Role.BranchAdmin && u.BranchId == student.BranchId)
                .Select(u => u.Id)
                .ToListAsync();

            foreach (var adminId in branchAdminIds)
            {
                await _notifications.Enqueue(
                    student.InstituteId,
                    NotificationEventType.RiskEscalation,
                    adminId,
                    new Dictionary<string, string> { ["StudentName"] = student.FullName });
            }

            await _db.SaveChangesAsync();
        }

        return true;
    }

    private static List<string> TopFactors(Dtos.AiPredictRequest request)
{
    var candidates = new List<(double severity, string phrase)>();

    if (request.AttendanceRate < 0.75)
        candidates.Add((0.75 - request.AttendanceRate,
            $"Attendance rate is only {Math.Round(request.AttendanceRate * 100)}% (below 75% threshold)"));

    if (request.LateRate > 0.20)
        candidates.Add((request.LateRate,
            $"Frequently late — {Math.Round(request.LateRate * 100)}% of sessions checked in after grace period"));

    if (request.OverdueInvoiceCount > 0)
        candidates.Add((0.4 + request.OverdueInvoiceCount * 0.1,
            request.OverdueInvoiceCount == 1
                ? "Has 1 overdue fee invoice"
                : $"Has {request.OverdueInvoiceCount} overdue fee invoices"));

    if (request.EngagementScore < 5.0)
        candidates.Add((5.0 - request.EngagementScore,
            $"Low engagement score ({request.EngagementScore}/10) — infrequent attendance and low parent portal activity"));

    if (request.ClassesEnrolled == 0)
        candidates.Add((0.3, "Not enrolled in any class"));

    var factors = candidates.OrderByDescending(c => c.severity).Take(3).Select(c => c.phrase).ToList();
    if (factors.Count == 0)
        factors.Add("No single dominant risk factor — score reflects overall attendance and engagement pattern");

    return factors;
}
}
