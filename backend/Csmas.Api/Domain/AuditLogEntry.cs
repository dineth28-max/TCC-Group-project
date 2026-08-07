namespace Csmas.Api.Domain;

/// <summary>
/// Generic audit trail (Phase 16) for sensitive settings/credential changes — Payment Account,
/// Revenue Split, Institute/Teacher Bank Details, and teacher/parent password resets. None of this
/// was recorded before Phase 16; "who approved this bank detail change, and when" had no answer.
/// </summary>
public class AuditLogEntry
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public int ActorUserId { get; set; }
    public User? ActorUser { get; set; }

    public string Action { get; set; } = string.Empty;
    public string? TargetDescription { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
