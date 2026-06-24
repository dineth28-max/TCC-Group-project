namespace Csmas.Api.Domain;

public class Class
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int BranchId { get; set; }
    public Branch? Branch { get; set; }

    public string Subject { get; set; } = string.Empty;
    public int? TeacherUserId { get; set; }
    public User? TeacherUser { get; set; }

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}
