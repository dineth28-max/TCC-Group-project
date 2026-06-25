namespace Csmas.Api.Dtos;

public record PaymentAccountResponse(string? GatewayProvider, string? AccountIdentifier, bool HasApiKey, bool HasApiSecret, bool HasWebhookSecret);

public record UpdatePaymentAccountRequest(string GatewayProvider, string? AccountIdentifier, string? ApiKey, string? ApiSecret, string? WebhookSecret);

public record InstituteBankDetailResponse(string? AccountHolderName, string? BankName, string? MaskedAccountNumber, string? BranchName, string? RoutingOrSwiftCode, bool HasDetails);

public record SaveInstituteBankDetailRequest(string AccountHolderName, string BankName, string AccountNumber, string? BranchName, string? RoutingOrSwiftCode);

public record AuditLogRow(int Id, string ActorName, string Action, string? TargetDescription, DateTime CreatedAt);

public record RevenueSplitResponse(decimal CommissionPercent);

public record UpdateRevenueSplitRequest(decimal CommissionPercent);

public record CheckoutRequest(int InvoiceId);

public record PaymentTransactionResponse(
    int Id, int InvoiceId, decimal Amount, string Status,
    string GatewayProvider, string GatewayReference, DateTime CreatedAt, DateTime? CompletedAt,
    string? CheckoutUrl = null);

public record GatewayWebhookRequest(int TransactionId, string GatewayReference, string Status);

public record TeacherRevenueSummaryRow(int TeacherUserId, string TeacherName, decimal TotalNetEarned, decimal TotalCommission, int TransactionCount);

public record TeacherRevenueOverviewResponse(List<TeacherRevenueSummaryRow> Teachers, decimal AdminCommissionIncome);

public record TeacherEarningRow(
    int Id, int TeacherUserId, string TeacherName, int PaymentTransactionId,
    decimal GrossAmount, decimal CommissionPercent, decimal CommissionAmount, decimal NetAmount,
    string PayoutStatus, DateTime CreatedAt);

public record TeacherBankDetailResponse(int TeacherUserId, string? AccountHolderName, string? BankName, string? MaskedAccountNumber, bool HasDetails);

public record SaveTeacherBankDetailRequest(string AccountHolderName, string BankName, string AccountNumber);
