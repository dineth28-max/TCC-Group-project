namespace Csmas.Api.Domain;

/// <summary>
/// Admin/Branch Admin post shown in the Parent Portal announcements feed. BranchId null means
/// institute-wide; set means visible only to parents whose linked child is in that branch.
/// </summary>
public class Announcement
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
