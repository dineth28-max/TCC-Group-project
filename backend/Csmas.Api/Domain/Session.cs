namespace Csmas.Api.Domain;

public class Session
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }
    public int ClassId { get; set; }
    public Class? Class { get; set; }
    public int TeacherUserId { get; set; }

    public DateOnly SessionDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public int GraceMinutes { get; set; } = 10;
    public SessionStatus Status { get; set; } = SessionStatus.Open;

    public string? QrToken { get; set; }
    public DateTime? QrExpiresAt { get; set; }

    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}
