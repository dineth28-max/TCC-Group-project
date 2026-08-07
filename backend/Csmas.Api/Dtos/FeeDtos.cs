namespace Csmas.Api.Dtos;

public record CreateFeeStructureRequest(int ClassId, decimal Amount);
public record FeeStructureResponse(int Id, int ClassId, string Subject, decimal Amount, DateOnly EffectiveFrom, bool IsActive);

public record CreateDiscountRequest(int StudentId, string Type, decimal PercentOff);
public record DiscountResponse(int Id, int StudentId, string StudentName, string Type, decimal PercentOff, bool IsActive);

public record RecordPaymentRequest(decimal Amount, string Method = "Cash");

public record InvoiceResponse(
    int Id,
    int StudentId,
    string StudentName,
    int ClassId,
    string Subject,
    string BillingPeriod,
    decimal Amount,
    decimal DiscountAmount,
    decimal TotalDue,
    decimal AmountPaid,
    string Status,
    DateOnly DueDate);

public record CollectionSummaryResponse(string Period, decimal TotalInvoiced, decimal TotalCollected, decimal CollectionRatePercent);

public record RunBillingResponse(int InvoicesCreated, string Period);
