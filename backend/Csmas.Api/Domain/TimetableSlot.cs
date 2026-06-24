namespace Csmas.Api.Domain;

/// <summary>
/// One weekly recurring slot for a class. Conflict detection (TimetableController) rejects a new
/// slot if its time range overlaps another slot in the same branch that shares the same teacher or
/// the same room on the same day.
/// </summary>
public class TimetableSlot
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    public int ClassId { get; set; }
    public Class? Class { get; set; }

    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Room { get; set; }
}
