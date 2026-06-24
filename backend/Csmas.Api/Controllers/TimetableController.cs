using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Weekly recurring timetable slots with conflict detection (plan.md §6 F5): a new slot is
/// rejected if it overlaps another slot in the same branch, on the same day, that shares either
/// the same teacher or the same room.
/// </summary>
[ApiController]
[Route("api/timetable")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class TimetableController : TenantScopedController
{
    private readonly AppDbContext _db;

    public TimetableController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<TimetableSlotResponse>>> List([FromQuery] int? branchId)
    {
        var query = _db.TimetableSlots.Include(t => t.Class).ThenInclude(c => c!.TeacherUser).AsQueryable();
        if (IsBranchScoped) query = query.Where(t => t.BranchId == CurrentBranchId);
        else if (branchId.HasValue) query = query.Where(t => t.BranchId == branchId);

        var slots = await query.ToListAsync();
        return Ok(slots.Select(ToResponse).ToList());
    }

    [HttpPost]
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

        var sameBranchDaySlots = await _db.TimetableSlots
            .Include(t => t.Class)
            .Where(t => t.BranchId == klass.BranchId && t.DayOfWeek == day)
            .Where(t => t.StartTime < end && start < t.EndTime) // overlap test
            .ToListAsync();

        var conflict = sameBranchDaySlots.FirstOrDefault(t =>
            t.Room is not null && request.Room is not null && t.Room.Equals(request.Room, StringComparison.OrdinalIgnoreCase)
            || (klass.TeacherUserId.HasValue && t.Class?.TeacherUserId == klass.TeacherUserId));

        if (conflict is not null)
        {
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

        slot.Class = klass;
        return Ok(ToResponse(slot));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var slot = await _db.TimetableSlots.FindAsync(id);
        if (slot is null) return NotFound();
        if (IsBranchScoped && slot.BranchId != CurrentBranchId) return NotFound();

        _db.TimetableSlots.Remove(slot);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static TimetableSlotResponse ToResponse(TimetableSlot t) => new(
        t.Id, t.ClassId, t.Class?.Subject ?? string.Empty, t.BranchId, t.DayOfWeek.ToString(),
        t.StartTime.ToString("HH:mm"), t.EndTime.ToString("HH:mm"), t.Room,
        t.Class?.TeacherUserId, t.Class?.TeacherUser?.FullName);
}
