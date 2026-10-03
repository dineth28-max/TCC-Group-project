using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Builds the AI model's 7 input features from real CSMAS records. The single-student and bulk
/// paths share <see cref="Compose"/>, so a student's features are identical whether they are
/// scored on their own (after an attendance/payment event), in a batch, or used as training data.
/// </summary>
public class RiskFeatureBuilder
{
    private readonly AppDbContext _db;

    public RiskFeatureBuilder(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Raw per-student counts the features are derived from.</summary>
    public record StudentStats(
        int TotalSessions,
        int PresentOrLate,
        int Late,
        int OverdueInvoices,
        int ParentLogins30Days,
        DateTime EnrolledSince,
        int ClassesEnrolled);

    public async Task<AiPredictRequest?> BuildFeatures(int studentId)
    {
        var features = await BuildFeaturesForStudents(new[] { studentId });
        return features.GetValueOrDefault(studentId);
    }

    /// <summary>
    /// Features for many students in a handful of grouped queries (instead of ~6 per student), so
    /// a whole institute can be scored or used as training data in seconds.
    /// </summary>
    public async Task<Dictionary<int, AiPredictRequest>> BuildFeaturesForStudents(IReadOnlyCollection<int> studentIds)
    {
        if (studentIds.Count == 0) return new Dictionary<int, AiPredictRequest>();
        var ids = studentIds.ToList();

        var students = await _db.Students
            .Where(s => ids.Contains(s.Id))
            .Select(s => new { s.Id, s.CreatedAt })
            .ToListAsync();

        var attendance = await _db.Attendances
            .Where(a => ids.Contains(a.StudentId))
            .GroupBy(a => a.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                Total = g.Count(),
                PresentOrLate = g.Count(a => a.Status != AttendanceStatus.Absent),
                Late = g.Count(a => a.Status == AttendanceStatus.Late),
            })
            .ToDictionaryAsync(x => x.StudentId);

        var overdue = await _db.Invoices
            .Where(i => ids.Contains(i.StudentId) && i.Status == InvoiceStatus.Overdue)
            .GroupBy(i => i.StudentId)
            .Select(g => new { StudentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StudentId, x => x.Count);

        var since = DateTime.UtcNow.AddDays(-30);
        var parentLinks = await _db.ParentLinks
            .Where(p => ids.Contains(p.StudentId))
            .Select(p => new { p.StudentId, p.ParentUserId })
            .ToListAsync();
        var parentIds = parentLinks.Select(p => p.ParentUserId).Distinct().ToList();
        var loginsByParent = parentIds.Count == 0
            ? new Dictionary<int, int>()
            : await _db.UserLoginEvents
                .Where(l => parentIds.Contains(l.UserId) && l.LoggedInAt >= since)
                .GroupBy(l => l.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count);
        var parentLogins = parentLinks
            .GroupBy(p => p.StudentId)
            .ToDictionary(g => g.Key, g => g.Sum(p => loginsByParent.GetValueOrDefault(p.ParentUserId)));

        var enrollments = await _db.Enrollments
            .Where(e => ids.Contains(e.StudentId))
            .GroupBy(e => e.StudentId)
            .Select(g => new { StudentId = g.Key, Earliest = g.Min(e => e.EnrolledAt), Count = g.Count() })
            .ToDictionaryAsync(x => x.StudentId);

        var result = new Dictionary<int, AiPredictRequest>();
        foreach (var student in students)
        {
            attendance.TryGetValue(student.Id, out var att);
            enrollments.TryGetValue(student.Id, out var enr);
            var stats = new StudentStats(
                att?.Total ?? 0,
                att?.PresentOrLate ?? 0,
                att?.Late ?? 0,
                overdue.GetValueOrDefault(student.Id),
                parentLogins.GetValueOrDefault(student.Id),
                enr?.Earliest ?? student.CreatedAt,
                enr?.Count ?? 0);
            result[student.Id] = Compose(student.Id, stats);
        }
        return result;
    }

    /// <summary>The one place raw counts become model features.</summary>
    public static AiPredictRequest Compose(int studentId, StudentStats stats)
    {
        // --- attendance_rate & late_rate ---
        var attendanceRate = stats.TotalSessions == 0 ? 1.0 : (double)stats.PresentOrLate / stats.TotalSessions;
        var lateRate = stats.TotalSessions == 0 ? 0.0 : (double)stats.Late / stats.TotalSessions;

        // --- engagement_score ---
        var engagementScore = Math.Clamp(
            Math.Round(attendanceRate * 6.0 + Math.Min(stats.ParentLogins30Days, 10) * 0.4, 1),
            1.0, 10.0);

        // --- semester ---
        var monthsEnrolled = Math.Max(0.0, (DateTime.UtcNow - stats.EnrolledSince).TotalDays / 30.0);
        var semester = Math.Clamp((int)Math.Ceiling(monthsEnrolled / 6.0), 1, 8);

        return new AiPredictRequest
        {
            StudentId = studentId,
            AttendanceRate = Math.Round(attendanceRate, 3),
            LateRate = Math.Round(lateRate, 3),
            FinancialIssues = stats.OverdueInvoices > 0 ? 1 : 0,
            OverdueInvoiceCount = stats.OverdueInvoices,
            EngagementScore = engagementScore,
            Semester = semester,
            ClassesEnrolled = stats.ClassesEnrolled,
        };
    }
}
