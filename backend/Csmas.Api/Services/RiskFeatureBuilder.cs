using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

public class RiskFeatureBuilder
{
    private readonly AppDbContext _db;

    public RiskFeatureBuilder(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AiPredictRequest?> BuildFeatures(int studentId)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId);
        if (student is null) return null;

        // --- attendance_rate & late_rate ---
        var attendanceStatuses = await _db.Attendances
            .Where(a => a.StudentId == studentId)
            .Select(a => a.Status)
            .ToListAsync();

        var totalSessions = attendanceStatuses.Count;
        var presentOrLate = attendanceStatuses.Count(s => s != AttendanceStatus.Absent);
        var lateCount     = attendanceStatuses.Count(s => s == AttendanceStatus.Late);

        var attendanceRate = totalSessions == 0 ? 1.0 : (double)presentOrLate / totalSessions;
        var lateRate       = totalSessions == 0 ? 0.0 : (double)lateCount / totalSessions;

        // --- financial_issues & overdue_invoice_count ---
        var overdueCount = await _db.Invoices
            .CountAsync(i => i.StudentId == studentId && i.Status == InvoiceStatus.Overdue);

        // --- engagement_score ---
        var parentUserIds = await _db.ParentLinks
            .Where(p => p.StudentId == studentId)
            .Select(p => p.ParentUserId)
            .ToListAsync();

        var since = DateTime.UtcNow.AddDays(-30);
        var parentLoginFrequency = parentUserIds.Count == 0
            ? 0
            : await _db.UserLoginEvents.CountAsync(l => parentUserIds.Contains(l.UserId) && l.LoggedInAt >= since);

        var engagementScore = Math.Clamp(
            Math.Round(attendanceRate * 6.0 + Math.Min(parentLoginFrequency, 10) * 0.4, 1),
            1.0, 10.0);

        // --- semester ---
        var earliestEnrolment = await _db.Enrollments
            .Where(e => e.StudentId == studentId)
            .Select(e => e.EnrolledAt)
            .OrderBy(d => d)
            .FirstOrDefaultAsync();

        var enrolledSince  = earliestEnrolment == default ? student.CreatedAt : earliestEnrolment;
        var monthsEnrolled = Math.Max(0.0, (DateTime.UtcNow - enrolledSince).TotalDays / 30.0);
        var semester       = Math.Clamp((int)Math.Ceiling(monthsEnrolled / 6.0), 1, 8);

        // --- classes_enrolled ---
        var classesEnrolled = await _db.Enrollments
            .CountAsync(e => e.StudentId == studentId);

        return new AiPredictRequest
        {
            StudentId           = studentId,
            AttendanceRate      = Math.Round(attendanceRate, 3),
            LateRate            = Math.Round(lateRate, 3),
            FinancialIssues     = overdueCount > 0 ? 1 : 0,
            OverdueInvoiceCount = overdueCount,
            EngagementScore     = engagementScore,
            Semester            = semester,
            ClassesEnrolled     = classesEnrolled,
        };
    }
}