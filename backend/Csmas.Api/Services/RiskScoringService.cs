using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Orchestrates F7 (plan.md §14.6): build students' features, ask the AI service's trained
/// model for a probability, turn that into a score/bucket/plain-language reasons, persist it, and
/// fire a RiskEscalation notification on a Medium→High crossing. Every call is wrapped by the
/// caller in try/catch — a failure here must never fail the attendance/payment action that
/// triggered it.
/// </summary>
public class RiskScoringService
{
    private const int BatchSize = 250;

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

        return await ApplyPredictions(new Dictionary<int, AiPredictRequest> { [studentId] = request },
            new Dictionary<int, double> { [studentId] = prediction.RiskProbability }) == 1;
    }

    /// <summary>
    /// Scores many students through the AI service's batch endpoint. Returns how many were scored;
    /// stops early (leaving remaining scores untouched) if the AI service becomes unavailable.
    /// </summary>
    public async Task<int> RecomputeForStudents(IReadOnlyCollection<int> studentIds)
    {
        var scored = 0;
        foreach (var chunk in studentIds.Chunk(BatchSize))
        {
            var features = await _featureBuilder.BuildFeaturesForStudents(chunk);
            if (features.Count == 0) continue;

            var predictions = await _aiClient.PredictBatch(features.Values.ToList());
            if (predictions is null)
            {
                _logger.LogWarning("Batch risk scoring stopped after {Scored} students — AI service unavailable.", scored);
                break;
            }

            var probabilities = predictions
                .Where(p => features.ContainsKey(p.StudentId))
                .ToDictionary(p => p.StudentId, p => p.RiskProbability);
            scored += await ApplyPredictions(features, probabilities);
            _db.ChangeTracker.Clear();
        }
        return scored;
    }

    /// <summary>
    /// Trains the AI model on this institute's own student records: every student's current
    /// features, labelled with whether they actually dropped out (their record is Inactive).
    /// Returns the new model's evaluation, or null if the AI service rejected/was unreachable.
    /// </summary>
    public async Task<(AiModelInfo? Model, string? Error)> TrainModelFromStudentRecords()
    {
        var students = await _db.Students
            .Select(s => new { s.Id, s.Status })
            .ToListAsync();
        if (students.Count == 0) return (null, "There are no students to train on yet.");

        var features = await _featureBuilder.BuildFeaturesForStudents(students.Select(s => s.Id).ToList());
        var rows = students
            .Where(s => features.ContainsKey(s.Id))
            .Select(s =>
            {
                var f = features[s.Id];
                return new AiTrainingRow
                {
                    StudentId = s.Id,
                    AttendanceRate = f.AttendanceRate,
                    LateRate = f.LateRate,
                    FinancialIssues = f.FinancialIssues,
                    OverdueInvoiceCount = f.OverdueInvoiceCount,
                    EngagementScore = f.EngagementScore,
                    Semester = f.Semester,
                    ClassesEnrolled = f.ClassesEnrolled,
                    Dropout = s.Status == StudentStatus.Inactive ? 1 : 0,
                };
            })
            .ToList();

        var dropouts = rows.Count(r => r.Dropout == 1);
        if (dropouts < 10 || rows.Count - dropouts < 10)
        {
            return (null, $"Training needs at least 10 students who left (Inactive) and 10 active students — found {dropouts} and {rows.Count - dropouts}.");
        }

        var model = await _aiClient.Train(rows);
        return model is null
            ? (null, "The AI service could not train the model right now. Please try again shortly.")
            : (model, null);
    }

    private async Task<int> ApplyPredictions(Dictionary<int, AiPredictRequest> features, Dictionary<int, double> probabilities)
    {
        var ids = probabilities.Keys.ToList();
        var students = await _db.Students.Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id);
        var existing = await _db.RiskScores.Where(r => ids.Contains(r.StudentId)).ToDictionaryAsync(r => r.StudentId);
        var escalations = new List<Student>();

        foreach (var (studentId, probability) in probabilities)
        {
            if (!students.TryGetValue(studentId, out var student)) continue;

            var score = (int)Math.Round(probability * 100);
            var level = score < 40 ? RiskLevel.Low : score < 70 ? RiskLevel.Medium : RiskLevel.High;
            var factors = TopFactors(features[studentId]);

            if (!existing.TryGetValue(studentId, out var riskScore))
            {
                riskScore = new RiskScore { InstituteId = student.InstituteId, StudentId = studentId };
                _db.RiskScores.Add(riskScore);
            }
            var previousLevel = existing.ContainsKey(studentId) ? riskScore.Level : (RiskLevel?)null;

            // Invariant: RiskScore.Score is only ever assigned here, from a real, successful
            // prediction by the AI service's trained model — never a default/placeholder. If the
            // AI call fails, callers return before reaching this method and nothing is persisted.
            riskScore.PreviousLevel = previousLevel;
            riskScore.Score = score;
            riskScore.Level = level;
            riskScore.TopFactor1 = factors.ElementAtOrDefault(0);
            riskScore.TopFactor2 = factors.ElementAtOrDefault(1);
            riskScore.TopFactor3 = factors.ElementAtOrDefault(2);
            riskScore.ComputedAt = DateTime.UtcNow;

            if (previousLevel == RiskLevel.Medium && level == RiskLevel.High) escalations.Add(student);
        }

        await _db.SaveChangesAsync();

        foreach (var student in escalations)
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
        }
        if (escalations.Count > 0) await _db.SaveChangesAsync();

        return probabilities.Keys.Count(students.ContainsKey);
    }

    private static List<string> TopFactors(AiPredictRequest request)
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
