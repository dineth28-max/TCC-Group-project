namespace Csmas.Api.Domain;

public class Payment
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash";
    public int RecordedByUserId { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}
