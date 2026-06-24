namespace Csmas.Api.Domain;

public class Invoice
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int StudentId { get; set; }
    public Student? Student { get; set; }
    public int ClassId { get; set; }
    public Class? Class { get; set; }

    public string BillingPeriod { get; set; } = string.Empty; // "yyyy-MM"
    public decimal Amount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalDue { get; set; }
    public decimal AmountPaid { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;
    public DateOnly DueDate { get; set; }

    public DateTime? ReminderT7SentAt { get; set; }
    public DateTime? ReminderT1SentAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
