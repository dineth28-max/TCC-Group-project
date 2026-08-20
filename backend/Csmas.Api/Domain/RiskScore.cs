namespace Csmas.Api.Domain;

/// <summary>
/// Current AI risk state for one student (F7, plan.md §14.6) — one row per student, overwritten on
/// every recompute rather than kept as history. PreviousLevel captures the level just before this
/// update so RiskScoringService can detect a Medium→High crossing and fire a notification.
/// </summary>
public class RiskScore
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }

    public int Score { get; set; }
    public RiskLevel Level { get; set; }
    public RiskLevel? PreviousLevel { get; set; }

    public string? TopFactor1 { get; set; }
    public string? TopFactor2 { get; set; }
    public string? TopFactor3 { get; set; }

    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;
}
