namespace Csmas.Api.Domain;

/// <summary>
/// One row per teacher (Phase 15): payout account info. AccountNumber is stored encrypted via
/// Data Protection and only ever returned masked to its last 4 digits by any API response.
/// </summary>
public class TeacherBankDetail
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public int TeacherUserId { get; set; }
    public User? TeacherUser { get; set; }

    public string AccountHolderName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string AccountNumberEncrypted { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
