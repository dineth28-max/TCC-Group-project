namespace Csmas.Api.Domain;

/// <summary>
/// Minimal parent-to-student link so Phase 3/4 notification triggers have a real recipient to
/// queue against. The full Parent Portal UI for managing these links is built in Phase 5.
/// </summary>
public class ParentLink
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int ParentUserId { get; set; }
    public User? ParentUser { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
