using System.Data;
using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Weekly recurring timetable slots with conflict detection (plan.md §6 F5): a new slot is
/// rejected if it overlaps another slot in the same branch, on the same day, that shares either
/// the same teacher or the same room. Direct creation (Create) is Admin-only as of Phase 17 — a
/// Teacher proposes a slot via the Request* endpoints below instead, and it only becomes a real
/// TimetableSlot once an Admin approves it, re-running this same conflict check against the
/// then-current timetable.
/// </summary>
[ApiController]
[Route("api/timetable")]
[Authorize(Roles = "SystemAdmin,BranchAdmin,Teacher")]
public class TimetableController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly NotificationQueueService _notificationQueue;

    public TimetableController(AppDbContext db, NotificationQueueService notificationQueue)
    {
        _db = db;
        _notificationQueue = notificationQueue;
    }

    [HttpGet]
    public async Task<ActionResult<List<TimetableSlotResponse>>> List([FromQuery] int? branchId)
    {
        var query = _db.TimetableSlots.Include(t => t.Class).ThenInclude(c => c!.TeacherUser).AsQueryable();
        if (User.IsInRole("Teacher")) query = query.Where(t => t.Class!.TeacherUserId == CurrentUserId);
        else if (IsBranchScoped) query = query.Where(t => t.BranchId == CurrentBranchId);
        else if (branchId.HasValue) query = query.Where(t => t.BranchId == branchId);

        var slots = await query.ToListAsync();
        return Ok(slots.Select(ToResponse).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "SystemAdmin,BranchAdmin")]
    public async Task<ActionResult<TimetableSlotResponse>> Create([FromBody] CreateTimetableSlotRequest request)
    {
        if (!Enum.TryParse<DayOfWeek>(request.DayOfWeek, true, out var day))
        {
            return BadRequest(new { message = "DayOfWeek must be a valid day name (e.g. Monday)." });
        }
        if (!TimeOnly.TryParse(request.StartTime, out var start) || !TimeOnly.TryParse(request.EndTime, out var end) || end <= start)
        {
            return BadRequest(new { message = "StartTime/EndTime must be valid times with StartTime before EndTime." });
        }

        var klass = await _db.Classes.Include(c => c.TeacherUser).FirstOrDefaultAsync(c => c.Id == request.ClassId);
        if (klass is null) return BadRequest(new { message = "Class not found." });
        if (IsBranchScoped && klass.BranchId != CurrentBranchId) return Forbid();
        if (!klass.TeacherUserId.HasValue)
        {
            return BadRequest(new { message = $"\"{klass.Subject}\" has no teacher assigned. Assign a teacher to this class before scheduling a slot." });
        }

        // Same race PaymentService.InitiateCheckout already guards against: a plain "is there a
        // conflict" check has a TOCTOU gap — two concurrent creates/approvals for the same branch
        // can both pass FindConflict before either's slot row exists. Row-lock the branch so the
        // second request blocks here until the first commits, then (under READ COMMITTED) re-reads
        // and correctly sees the first's now-existing slot.
        await using var lockTx = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Branches WHERE Id = {klass.BranchId} FOR UPDATE");

        var conflict = await FindConflict(klass, day, start, end, request.Room);
        if (conflict is not null)
        {
            await lockTx.RollbackAsync();
            return Conflict(new { message = $"Time conflict with an existing slot for {conflict.Class?.Subject} ({conflict.StartTime}-{conflict.EndTime})." });
        }

        var slot = new TimetableSlot
        {
            InstituteId = CurrentInstituteId,
            BranchId = klass.BranchId,
            ClassId = klass.Id,
            DayOfWeek = day,
            StartTime = start,
            EndTime = end,
            Room = request.Room,
        };
        _db.TimetableSlots.Add(slot);
        await _db.SaveChangesAsync();
        await lockTx.CommitAsync();

        slot.Class = klass;
        return Ok(ToResponse(slot));
    }

    /// <summary>Teacher proposes a slot (Phase 17); becomes a real TimetableSlot only once an Admin approves it.</summary>
    [HttpPost("requests")]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<TimetableSlotRequestResponse>> CreateRequest([FromBody] CreateTimetableSlotRequestRequest request)
    {
        if (!Enum.TryParse<DayOfWeek>(request.DayOfWeek, true, out var day))
        {
            return BadRequest(new { message = "DayOfWeek must be a valid day name (e.g. Monday)." });
        }
        if (!TimeOnly.TryParse(request.StartTime, out var start) || !TimeOnly.TryParse(request.EndTime, out var end) || end <= start)
        {
            return BadRequest(new { message = "StartTime/EndTime must be valid times with StartTime before EndTime." });
        }

        var klass = await _db.Classes.Include(c => c.TeacherUser).FirstOrDefaultAsync(c => c.Id == request.ClassId);
        if (klass is null) return BadRequest(new { message = "Class not found." });
        if (klass.TeacherUserId != CurrentUserId) return Forbid();

        var conflict = await FindConflict(klass, day, start, end, request.Room);
        if (conflict is not null)
        {
            return Conflict(new { message = $"Time conflict with an existing slot for {conflict.Class?.Subject} ({conflict.StartTime}-{conflict.EndTime})." });
        }

        var slotRequest = new TimetableSlotRequest
        {
            InstituteId = CurrentInstituteId,
            BranchId = klass.BranchId,
            ClassId = klass.Id,
            RequestedByUserId = CurrentUserId,
            DayOfWeek = day,
            StartTime = start,
            EndTime = end,
            Room = request.Room,
        };
        _db.TimetableSlotRequests.Add(slotRequest);
        await _db.SaveChangesAsync();

        slotRequest.Class = klass;
        return Ok(ToRequestResponse(slotRequest, klass.TeacherUser?.FullName ?? string.Empty));
    }

    [HttpGet("requests")]
    public async Task<ActionResult<List<TimetableSlotRequestResponse>>> ListRequests([FromQuery] string? status)
    {
        var query = _db.TimetableSlotRequests.Include(r => r.Class).Include(r => r.RequestedByUser).AsQueryable();
        if (User.IsInRole("Teacher")) query = query.Where(r => r.RequestedByUserId == CurrentUserId);
        else if (IsBranchScoped) query = query.Where(r => r.BranchId == CurrentBranchId);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TimetableRequestStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(r => r.Status == parsedStatus);
        }

        var requests = await query.OrderByDescending(r => r.RequestedAt).ToListAsync();
        return Ok(requests.Select(r => ToRequestResponse(r, r.RequestedByUser?.FullName ?? string.Empty)).ToList());
    }

    [HttpPost("requests/{id:int}/approve")]
    [Authorize(Roles = "SystemAdmin,BranchAdmin")]
    public async Task<ActionResult<TimetableSlotRequestResponse>> Approve(int id, [FromBody] ReviewTimetableSlotRequestRequest request)
    {
        var slotRequest = await _db.TimetableSlotRequests.Include(r => r.Class).Include(r => r.RequestedByUser).FirstOrDefaultAsync(r => r.Id == id);
        if (slotRequest is null) return NotFound();
        if (IsBranchScoped && slotRequest.BranchId != CurrentBranchId) return NotFound();
        if (slotRequest.Status != TimetableRequestStatus.Pending) return BadRequest(new { message = "This request has already been reviewed." });

        // Same TOCTOU race as Create (see comment there) — two pending requests for overlapping
        // slots could both be approved concurrently. Lock the branch for the duration of the
        // conflict re-check + slot insert so only one approval at a time can land per branch.
        await using var lockTx = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Branches WHERE Id = {slotRequest.BranchId} FOR UPDATE");

        var conflict = await FindConflict(slotRequest.Class!, slotRequest.DayOfWeek, slotRequest.StartTime, slotRequest.EndTime, slotRequest.Room);
        if (conflict is not null)
        {
            await lockTx.RollbackAsync();
            return Conflict(new { message = $"Time conflict with an existing slot for {conflict.Class?.Subject} ({conflict.StartTime}-{conflict.EndTime})." });
        }

        var slot = new TimetableSlot
        {
            InstituteId = slotRequest.InstituteId,
            BranchId = slotRequest.BranchId,
            ClassId = slotRequest.ClassId,
            DayOfWeek = slotRequest.DayOfWeek,
            StartTime = slotRequest.StartTime,
            EndTime = slotRequest.EndTime,
            Room = slotRequest.Room,
        };
        _db.TimetableSlots.Add(slot);

        slotRequest.Status = TimetableRequestStatus.Approved;
        slotRequest.ReviewedByUserId = CurrentUserId;
        slotRequest.ReviewedAt = DateTime.UtcNow;
        slotRequest.ReviewNote = request.Note;

        var enrolledStudentUserIds = await _db.Enrollments
            .Where(e => e.ClassId == slotRequest.ClassId)
            .Include(e => e.Student)
            .Select(e => e.Student!.LinkedUserId)
            .Where(linkedUserId => linkedUserId.HasValue)
            .ToListAsync();

        var placeholders = new Dictionary<string, string>
        {
            ["Subject"] = slotRequest.Class!.Subject,
            ["DayOfWeek"] = slotRequest.DayOfWeek.ToString(),
            ["StartTime"] = slotRequest.StartTime.ToString("HH:mm"),
            ["EndTime"] = slotRequest.EndTime.ToString("HH:mm"),
            ["RoomSuffix"] = string.IsNullOrWhiteSpace(slotRequest.Room) ? "" : $" in room {slotRequest.Room}",
        };
        foreach (var linkedUserId in enrolledStudentUserIds)
        {
            await _notificationQueue.Enqueue(slotRequest.InstituteId, NotificationEventType.ClassScheduleApproved, linkedUserId!.Value, placeholders);
        }

        await _db.SaveChangesAsync();
        slotRequest.ResultingSlotId = slot.Id;
        await _db.SaveChangesAsync();
        await lockTx.CommitAsync();

        return Ok(ToRequestResponse(slotRequest, slotRequest.RequestedByUser?.FullName ?? string.Empty));
    }

    [HttpPost("requests/{id:int}/reject")]
    [Authorize(Roles = "SystemAdmin,BranchAdmin")]
    public async Task<ActionResult<TimetableSlotRequestResponse>> Reject(int id, [FromBody] ReviewTimetableSlotRequestRequest request)
    {
        var slotRequest = await _db.TimetableSlotRequests.Include(r => r.Class).Include(r => r.RequestedByUser).FirstOrDefaultAsync(r => r.Id == id);
        if (slotRequest is null) return NotFound();
        if (IsBranchScoped && slotRequest.BranchId != CurrentBranchId) return NotFound();
        if (slotRequest.Status != TimetableRequestStatus.Pending) return BadRequest(new { message = "This request has already been reviewed." });

        slotRequest.Status = TimetableRequestStatus.Rejected;
        slotRequest.ReviewedByUserId = CurrentUserId;
        slotRequest.ReviewedAt = DateTime.UtcNow;
        slotRequest.ReviewNote = request.Note;
        await _db.SaveChangesAsync();

        return Ok(ToRequestResponse(slotRequest, slotRequest.RequestedByUser?.FullName ?? string.Empty));
    }

    private async Task<TimetableSlot?> FindConflict(Class klass, DayOfWeek day, TimeOnly start, TimeOnly end, string? room)
    {
        var sameBranchDaySlots = await _db.TimetableSlots
            .Include(t => t.Class)
            .Where(t => t.BranchId == klass.BranchId && t.DayOfWeek == day)
            .Where(t => t.StartTime < end && start < t.EndTime) // overlap test
            .ToListAsync();

        return sameBranchDaySlots.FirstOrDefault(t =>
            t.Room is not null && room is not null && t.Room.Equals(room, StringComparison.OrdinalIgnoreCase)
            || (klass.TeacherUserId.HasValue && t.Class?.TeacherUserId == klass.TeacherUserId));
    }

    private static TimetableSlotRequestResponse ToRequestResponse(TimetableSlotRequest r, string requestedByName) => new(
        r.Id, r.ClassId, r.Class?.Subject ?? string.Empty, r.DayOfWeek.ToString(),
        r.StartTime.ToString("HH:mm"), r.EndTime.ToString("HH:mm"), r.Room,
        r.Status.ToString(), r.RequestedByUserId, requestedByName, r.RequestedAt, r.ReviewNote);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var slot = await _db.TimetableSlots.Include(t => t.Class).FirstOrDefaultAsync(t => t.Id == id);
        if (slot is null) return NotFound();
        if (User.IsInRole("Teacher") && slot.Class?.TeacherUserId != CurrentUserId) return NotFound();
        if (!User.IsInRole("Teacher") && IsBranchScoped && slot.BranchId != CurrentBranchId) return NotFound();

        _db.TimetableSlots.Remove(slot);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static TimetableSlotResponse ToResponse(TimetableSlot t) => new(
        t.Id, t.ClassId, t.Class?.Subject ?? string.Empty, t.BranchId, t.DayOfWeek.ToString(),
        t.StartTime.ToString("HH:mm"), t.EndTime.ToString("HH:mm"), t.Room,
        t.Class?.TeacherUserId, t.Class?.TeacherUser?.FullName);
}
