namespace Csmas.Api.Domain;

/// <summary>
/// A discount assigned to one student (sibling/scholarship/etc.) — applied automatically by the
/// billing job to every invoice generated for that student while the rule is active.
/// </summary>
public class DiscountRule
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }

    public DiscountType Type { get; set; }
    public decimal PercentOff { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
