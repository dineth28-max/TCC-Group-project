namespace Csmas.Api.Domain;

public class FeeStructure
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int ClassId { get; set; }
    public Class? Class { get; set; }

    public decimal Amount { get; set; }
    public DateOnly EffectiveFrom { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public bool IsActive { get; set; } = true;
}
