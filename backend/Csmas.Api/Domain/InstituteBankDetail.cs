namespace Csmas.Api.Domain;

/// <summary>
/// One row per institute (Phase 16): where the institute's own money actually lands — distinct from
/// PaymentAccountSettings, which only ever holds the *gateway's* merchant credentials, never a real
/// bank account. Encrypted at rest and masked to last 4 digits on every read, same posture as
/// TeacherBankDetail.
/// </summary>
public class InstituteBankDetail
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public string AccountHolderName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumberEncrypted { get; set; } = string.Empty;
    public string? BranchName { get; set; }
    public string? RoutingOrSwiftCode { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
