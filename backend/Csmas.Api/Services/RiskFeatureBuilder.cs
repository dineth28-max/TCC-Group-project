using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Builds the 7-field request body the AI service's pre-trained model actually expects
/// (ai-service/app.py's FEATURES). CSMAS has no grades/assignments/semester data at all, so
/// attendance_rate and financial_issues are computed from real records, engagement_score and
/// semester are honest derivations from real signals (attendance + portal logins, enrolment
/// duration), and avg_grade/assignments_submitted/failed_modules are fixed dataset-mean defaults
/// (identical across every student, so they contribute no differentiating signal — the model's
/// actual discrimination between students comes entirely from the fields that do vary).
/// </summary>
public class RiskFeatureBuilder
{
    private const double DefaultAvgGrade = 65.0;
    private const int DefaultAssignmentsSubmitted = 10;
    private const int DefaultFailedModules = 2;

    private readonly AppDbContext _db;

    public RiskFeatureBuilder(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AiPredictRequest?> BuildFeatures(int studentId)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId);
        if (student is null) return null;

        var attendanceRows = await _db.Attendances
            .Where(a => a.StudentId == studentId)
            .Select(a => a.Status)
            .ToListAsync();
        var attendanceRate = attendanceRows.Count == 0
            ? 1.0
            : (double)attendanceRows.Count(s => s != AttendanceStatus.Absent) / attendanceRows.Count;

        var hasOverdueInvoice = await _db.Invoices
            .AnyAsync(i => i.StudentId == studentId && i.Status == InvoiceStatus.Overdue);

        var parentUserIds = await _db.ParentLinks
            .Where(p => p.StudentId == studentId)
            .Select(p => p.ParentUserId)
            .ToListAsync();
        var since = DateTime.UtcNow.AddDays(-30);
        var parentLoginFrequency = parentUserIds.Count == 0
            ? 0
            : await _db.UserLoginEvents.CountAsync(l => parentUserIds.Contains(l.UserId) && l.LoggedInAt >= since);

        var earliestEnrolment = await _db.Enrollments
            .Where(e => e.StudentId == studentId)
            .Select(e => e.EnrolledAt)
            .OrderBy(d => d)
            .FirstOrDefaultAsync();
        var enrolledSince = earliestEnrolment == default ? student.CreatedAt : earliestEnrolment;
        var monthsEnrolled = Math.Max(0.0, (DateTime.UtcNow - enrolledSince).TotalDays / 30.0);

        var engagementScore = Math.Clamp(
            Math.Round(attendanceRate * 6.0 + Math.Min(parentLoginFrequency, 10) * 0.4, 1),
            1.0, 10.0);
        var semester = Math.Clamp((int)Math.Ceiling(monthsEnrolled / 6.0), 1, 8);

        return new AiPredictRequest
        {
            StudentId = studentId,
            AttendanceRate = Math.Round(attendanceRate, 3),
            AvgGrade = DefaultAvgGrade,
            AssignmentsSubmitted = DefaultAssignmentsSubmitted,
            FailedModules = DefaultFailedModules,
            FinancialIssues = hasOverdueInvoice ? 1 : 0,
            EngagementScore = engagementScore,
            Semester = semester,
        };
    }
}
