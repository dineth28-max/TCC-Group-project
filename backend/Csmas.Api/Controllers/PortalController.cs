using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Every endpoint here is scoped to the authenticated parent's own ParentLink rows — this is
/// defense in depth beyond the institute tenant filter, per plan.md §6 (F4): a parent must never
/// be able to query a student they aren't linked to, even within their own institute.
/// </summary>
[ApiController]
[Route("api/portal")]
[Authorize(Roles = "Parent")]
public class PortalController : TenantScopedController
{
    private readonly AppDbContext _db;

    public PortalController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<bool> IsLinked(int studentId) =>
        await _db.ParentLinks.AnyAsync(p => p.ParentUserId == CurrentUserId && p.StudentId == studentId);

    [HttpGet("children")]
    public async Task<ActionResult<List<PortalChildResponse>>> Children()
    {
        var children = await _db.ParentLinks
            .Where(p => p.ParentUserId == CurrentUserId)
            .Include(p => p.Student).ThenInclude(s => s!.Branch)
            .Where(p => p.Student != null)
            .Select(p => new PortalChildResponse(
                p.Student!.Id, p.Student.StudentCode, p.Student.FullName, p.Student.BranchId, p.Student.Branch!.Name))
            .ToListAsync();

        return Ok(children);
    }

    [HttpGet("children/{studentId:int}/attendance")]
    public async Task<ActionResult<PortalAttendanceResponse>> Attendance(int studentId)
    {
        if (!await IsLinked(studentId)) return NotFound();

        var enrollments = await _db.Enrollments
            .Where(e => e.StudentId == studentId)
            .Include(e => e.Class)
            .Where(e => e.Class != null)
            .ToListAsync();

        var rows = new List<SubjectAttendanceRow>();
        foreach (var enrollment in enrollments)
        {
            var closedSessionIds = await _db.Sessions
                .Where(s => s.ClassId == enrollment.ClassId && s.Status == SessionStatus.Closed)
                .Select(s => s.Id)
                .ToListAsync();

            if (closedSessionIds.Count == 0)
            {
                rows.Add(new SubjectAttendanceRow(enrollment.ClassId, enrollment.Class!.Subject, 0, 0, 0, 0, 0));
                continue;
            }

            var attendances = await _db.Attendances
                .Where(a => closedSessionIds.Contains(a.SessionId) && a.StudentId == studentId)
                .ToListAsync();

            var present = attendances.Count(a => a.Status == AttendanceStatus.Present);
            var late = attendances.Count(a => a.Status == AttendanceStatus.Late);
            var absent = attendances.Count(a => a.Status == AttendanceStatus.Absent);
            var rate = Math.Round(100m * (present + late) / closedSessionIds.Count, 1);

            rows.Add(new SubjectAttendanceRow(enrollment.ClassId, enrollment.Class!.Subject, closedSessionIds.Count, present, late, absent, rate));
        }

        var totalSessions = rows.Sum(r => r.TotalSessions);
        var totalPresentLate = rows.Sum(r => r.PresentCount + r.LateCount);
        var overall = totalSessions == 0 ? 0 : Math.Round(100m * totalPresentLate / totalSessions, 1);

        return Ok(new PortalAttendanceResponse(overall, rows));
    }

    [HttpGet("children/{studentId:int}/fees")]
    public async Task<ActionResult<PortalFeeResponse>> Fees(int studentId)
    {
        if (!await IsLinked(studentId)) return NotFound();

        var invoices = await _db.Invoices
            .Include(i => i.Student)
            .Include(i => i.Class)
            .Where(i => i.StudentId == studentId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var responses = invoices.Select(i => new InvoiceResponse(
            i.Id, i.StudentId, i.Student?.FullName ?? string.Empty, i.ClassId, i.Class?.Subject ?? string.Empty,
            i.BillingPeriod, i.Amount, i.DiscountAmount, i.TotalDue, i.AmountPaid, i.Status.ToString(), i.DueDate)).ToList();

        return Ok(new PortalFeeResponse(
            invoices.Sum(i => i.TotalDue - i.AmountPaid),
            invoices.Sum(i => i.AmountPaid),
            responses));
    }

    [HttpGet("announcements")]
    public async Task<ActionResult<List<AnnouncementResponse>>> Announcements()
    {
        var childBranchIds = await _db.ParentLinks
            .Where(p => p.ParentUserId == CurrentUserId)
            .Include(p => p.Student)
            .Where(p => p.Student != null)
            .Select(p => p.Student!.BranchId)
            .Distinct()
            .ToListAsync();

        var announcements = await _db.Announcements
            .Where(a => a.BranchId == null || childBranchIds.Contains(a.BranchId.Value))
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(announcements.Select(a => new AnnouncementResponse(a.Id, a.Title, a.Body, a.BranchId, null, "", a.CreatedAt)).ToList());
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<NotificationInboxResponse>> Notifications()
    {
        var items = await _db.NotificationQueueItems
            .Where(n => n.RecipientUserId == CurrentUserId && n.Channel == NotificationChannel.InSystem)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationInboxRow(n.Id, n.EventType.ToString(), n.Subject, n.Message, n.IsRead, n.CreatedAt))
            .ToListAsync();

        return Ok(new NotificationInboxResponse(items.Count(i => !i.IsRead), items));
    }

    [HttpPost("notifications/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var item = await _db.NotificationQueueItems
            .FirstOrDefaultAsync(n => n.Id == id && n.RecipientUserId == CurrentUserId && n.Channel == NotificationChannel.InSystem);
        if (item is null) return NotFound();

        item.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
