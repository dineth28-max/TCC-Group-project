namespace Csmas.Api.Domain;

public class Student
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    public string StudentCode { get; set; } = string.Empty;
    public string QrPayload { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;
    public DateOnly Dob { get; set; }
    public string? Gender { get; set; }
    public string? ContactPhone { get; set; }
    public string? ParentName { get; set; }
    public string? ParentContact { get; set; }
    public string? PhotoUrl { get; set; }

    public StudentStatus Status { get; set; } = StudentStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Optional link to a User login account (Role=Student) so portal/check-in actions resolve
    // to this roster row. Most roster rows have no login and exist for ID/QR purposes only.
    public int? LinkedUserId { get; set; }
    public User? LinkedUser { get; set; }

    public decimal? AttendanceRate { get; set; }
    public bool IsAttendanceFlagged { get; set; }

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<StudentDocument> Documents { get; set; } = new List<StudentDocument>();
}
