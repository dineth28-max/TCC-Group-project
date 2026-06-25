namespace Csmas.Api.Domain;

/// <summary>
/// A Teacher-proposed weekly slot awaiting Admin approval (Phase 17). Approval creates the real
/// TimetableSlot (ResultingSlotId) and notifies every student enrolled in the class; the conflict
/// check is re-run at approval time against the live timetable, not just trusted from request time.
/// </summary>
public class TimetableSlotRequest
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int BranchId { get; set; }
    public int ClassId { get; set; }
    public Class? Class { get; set; }

    public int RequestedByUserId { get; set; }
    public User? RequestedByUser { get; set; }

    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Room { get; set; }

    public TimetableRequestStatus Status { get; set; } = TimetableRequestStatus.Pending;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    public int? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    public int? ResultingSlotId { get; set; }
}
