namespace Csmas.Api.Domain;

/// <summary>
/// One row per online-payment attempt against an invoice (Phase 15). Created Pending at checkout,
/// then flipped to Success/Failed exclusively through PaymentWebhookService's signature-verified
/// callback path — the same path whether it's our in-process gateway simulation or a real
/// external gateway's HTTP webhook calling back in.
/// </summary>
public class PaymentTransaction
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public int InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }
    public int InitiatedByUserId { get; set; }
    public User? InitiatedByUser { get; set; }

    public decimal Amount { get; set; }
    public PaymentTransactionStatus Status { get; set; } = PaymentTransactionStatus.Pending;
    public string GatewayProvider { get; set; } = string.Empty;
    public string GatewayReference { get; set; } = string.Empty;

    /// <summary>Set once Success — the Payment row created via the existing Phase 4 state machine.</summary>
    public int? PaymentId { get; set; }
    public Payment? Payment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
