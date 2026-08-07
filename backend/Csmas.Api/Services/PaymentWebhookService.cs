using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Phase 15/16: the single path that ever flips a PaymentTransaction out of Pending, once its
/// caller has independently verified authenticity. <see cref="HandleCallback"/> does that
/// verification itself (custom HMAC-SHA256, used by the anonymous /api/payments/webhook endpoint
/// and, in-process, by PaymentService's MockPay simulation); <see cref="CompleteFromVerifiedSource"/>
/// is the same completion logic for callers that verify authenticity their own way — e.g. Stripe's
/// own webhook signature library — so neither gateway integration duplicates the apply-payment/
/// compute-split logic. Uses IgnoreQueryFilters() throughout because callers here have no
/// JWT/institute claim to scope by (anonymous gateway callbacks).
/// </summary>
public class PaymentWebhookService
{
    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly BillingService _billing;
    private readonly ILogger<PaymentWebhookService> _logger;

    public PaymentWebhookService(AppDbContext db, SecretEncryptionService encryption, BillingService billing, ILogger<PaymentWebhookService> logger)
    {
        _db = db;
        _encryption = encryption;
        _billing = billing;
        _logger = logger;
    }

    public static string BuildPayload(int transactionId, string gatewayReference, string status) =>
        $"{transactionId}|{gatewayReference}|{status}";

    public async Task<(bool Ok, string? Error)> HandleCallback(int transactionId, string gatewayReference, string status, string signature)
    {
        var tx = await _db.PaymentTransactions.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == transactionId);
        if (tx is null) return (false, "Transaction not found.");

        var account = await _db.PaymentAccountSettings.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.InstituteId == tx.InstituteId);
        if (string.IsNullOrEmpty(account?.ApiSecretEncrypted)) return (false, "Payment account not configured.");

        var secret = _encryption.Decrypt(account.ApiSecretEncrypted);
        var payload = BuildPayload(transactionId, gatewayReference, status);
        if (!PaymentGatewaySigner.Verify(secret, payload, signature)) return (false, "Invalid signature.");

        return await CompleteFromVerifiedSource(transactionId, gatewayReference, status == "success");
    }

    /// <summary>
    /// Applies a success/failure outcome to an already-authenticated transaction. The caller is
    /// responsible for having verified the outcome actually came from the gateway — this method
    /// trusts it unconditionally, by design, since re-verifying here would mean every gateway
    /// integration needs the exact same signature scheme (it doesn't: Stripe's differs entirely
    /// from the custom HMAC scheme HandleCallback verifies above).
    /// </summary>
    public async Task<(bool Ok, string? Error)> CompleteFromVerifiedSource(int transactionId, string gatewayReference, bool success)
    {
        var tx = await _db.PaymentTransactions.IgnoreQueryFilters()
            .Include(t => t.Invoice).ThenInclude(i => i!.Class)
            .FirstOrDefaultAsync(t => t.Id == transactionId);
        if (tx is null) return (false, "Transaction not found.");

        if (tx.Status != PaymentTransactionStatus.Pending) return (true, null); // already settled — idempotent

        tx.GatewayReference = gatewayReference;
        tx.CompletedAt = DateTime.UtcNow;

        if (!success)
        {
            tx.Status = PaymentTransactionStatus.Failed;
            await _db.SaveChangesAsync();
            return (true, null);
        }

        // Everything below must commit atomically: if SaveChangesAsync failed partway after
        // ApplyPayment's own internal save, a retried/duplicate callback would re-apply the
        // payment (idempotency above only short-circuits once tx.Status != Pending).
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            tx.Status = PaymentTransactionStatus.Success;

            var payment = await _billing.ApplyPayment(tx.Invoice!, tx.Amount, $"Online:{tx.GatewayProvider}", tx.InitiatedByUserId);
            tx.PaymentId = payment.Id;

            var teacherUserId = tx.Invoice!.Class?.TeacherUserId;
            if (teacherUserId.HasValue)
            {
                var split = await _db.RevenueSplitSettings.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(r => r.InstituteId == tx.InstituteId);
                var commissionPercent = split?.CommissionPercent ?? 2.00m;
                var commissionAmount = Math.Round(tx.Amount * commissionPercent / 100m, 2);

                _db.TeacherEarnings.Add(new TeacherEarning
                {
                    InstituteId = tx.InstituteId,
                    TeacherUserId = teacherUserId.Value,
                    PaymentTransactionId = tx.Id,
                    GrossAmount = tx.Amount,
                    CommissionPercent = commissionPercent,
                    CommissionAmount = commissionAmount,
                    NetAmount = tx.Amount - commissionAmount,
                });
            }
            else
            {
                _logger.LogWarning(
                    "PaymentTransaction {TransactionId} succeeded against Invoice {InvoiceId} but its class has no TeacherUserId — no TeacherEarning/commission income was recorded for this payment.",
                    tx.Id, tx.InvoiceId);
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, null);
        }
        catch (InvalidOperationException ex)
        {
            // Most likely ApplyPayment's overpayment guard — a concurrent payment on the same
            // invoice already consumed the remaining due between checkout and this callback.
            // Roll back the DB side, then clear the tracker — the in-memory tx/payment/earning
            // objects above still hold the (now-discarded) Success-path edits and must not be
            // reused, or the next save would resurrect them.
            await transaction.RollbackAsync();
            _db.ChangeTracker.Clear();

            var failedTx = await _db.PaymentTransactions.IgnoreQueryFilters().FirstAsync(t => t.Id == transactionId);
            failedTx.Status = PaymentTransactionStatus.Failed;
            failedTx.GatewayReference = gatewayReference;
            failedTx.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return (false, ex.Message);
        }
    }
}
