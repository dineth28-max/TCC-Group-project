namespace Csmas.Api.Domain;

public class Attendance
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int SessionId { get; set; }
    public Session? Session { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }

    public AttendanceStatus Status { get; set; }
    public AttendanceMethod Method { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public string? OverrideReason { get; set; }
    public decimal? GeoLat { get; set; }
    public decimal? GeoLng { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
