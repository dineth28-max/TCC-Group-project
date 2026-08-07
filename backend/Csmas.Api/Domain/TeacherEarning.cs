namespace Csmas.Api.Domain;

/// <summary>
/// One row per successful PaymentTransaction, attributing the gross/commission/net split to the
/// teacher of the invoice's class (Phase 15). CommissionPercent is a snapshot of RevenueSplitSettings
/// at the moment the transaction succeeded — never recomputed if the institute's commission % changes
/// later, so existing rows are never silently rewritten.
/// </summary>
public class TeacherEarning
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public int TeacherUserId { get; set; }
    public User? TeacherUser { get; set; }

    public int PaymentTransactionId { get; set; }
    public PaymentTransaction? PaymentTransaction { get; set; }

    public decimal GrossAmount { get; set; }
    public decimal CommissionPercent { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal NetAmount { get; set; }

    /// <summary>Whether the institute has paid this amount out to the teacher yet — independent of
    /// PaymentTransaction.Status, which only tracks the gateway charge itself.</summary>
    public string PayoutStatus { get; set; } = "Unpaid";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
