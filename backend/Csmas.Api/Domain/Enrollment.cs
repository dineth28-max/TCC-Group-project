namespace Csmas.Api.Domain;

public class Enrollment
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }
    public int ClassId { get; set; }
    public Class? Class { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
}
