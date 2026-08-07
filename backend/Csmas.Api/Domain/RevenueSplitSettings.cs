namespace Csmas.Api.Domain;

/// <summary>
/// One row per institute (Phase 15): the platform commission percentage applied to online
/// payments going forward. A change here only ever affects transactions created after the
/// change — TeacherEarning rows snapshot the percentage that was active at success time, so
/// they're never rewritten retroactively.
/// </summary>
public class RevenueSplitSettings
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public decimal CommissionPercent { get; set; } = 2.00m;

    public DateTime? UpdatedAt { get; set; }
}
