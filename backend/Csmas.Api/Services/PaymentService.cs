using System.Data;
using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Invoice = Csmas.Api.Domain.Invoice;

namespace Csmas.Api.Services;

/// <summary>
/// Phase 15/16: initiates an online payment against an invoice. Two paths, chosen by the
/// institute's configured GatewayProvider:
///  - "Stripe": creates a real Stripe Checkout Session and hands back its hosted URL — the payer
///    enters card details on Stripe's own page, never on ours (keeps CSMAS out of PCI-DSS scope).
///    The transaction stays Pending until Stripe's own webhook (api/payments/webhook/stripe)
///    confirms success.
///  - anything else (including unset, defaulting to "MockPay"): no real gateway account exists for
///    this demo deployment (same stand-in posture as Phase 6's dummy SMTP credentials), so this
///    signs and feeds itself a synthetic success callback in-process, through the exact same
///    PaymentWebhookService completion path Stripe's real webhook also uses.
/// </summary>
public class PaymentService
{
    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly PaymentWebhookService _webhook;
    private readonly IConfiguration _configuration;

    public PaymentService(AppDbContext db, SecretEncryptionService encryption, PaymentWebhookService webhook, IConfiguration configuration)
    {
        _db = db;
        _encryption = encryption;
        _webhook = webhook;
        _configuration = configuration;
    }

    public async Task<(PaymentTransaction? Transaction, string? CheckoutUrl, string? Error)> InitiateCheckout(Invoice invoice, int initiatedByUserId, string returnPath)
    {
        var remaining = invoice.TotalDue - invoice.AmountPaid;
        if (remaining <= 0) return (null, null, "This invoice has no outstanding balance.");

        var account = await _db.PaymentAccountSettings.FirstOrDefaultAsync(p => p.InstituteId == invoice.InstituteId);
        if (string.IsNullOrEmpty(account?.ApiKeyEncrypted) || string.IsNullOrEmpty(account.ApiSecretEncrypted))
        {
            return (null, null, "Online payments are not configured for this institute yet.");
        }

        PaymentTransaction tx;
        // A plain "does a transaction already exist" check has a race: two concurrent checkouts
        // for the same invoice can both pass it before either has inserted its row (confirmed
        // live — both succeeded, double-charging and losing one update to AmountPaid). Row-lock
        // the invoice under READ COMMITTED so the second request blocks here until the first
        // commits, then — because READ COMMITTED re-reads at statement time instead of using a
        // snapshot from transaction start — correctly sees the first's now-existing row and backs
        // off instead of also charging.
        await using (var lockTx = await _db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted))
        {
            await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Invoices WHERE Id = {invoice.Id} FOR UPDATE");

            var hasActiveTransaction = await _db.PaymentTransactions
                .AnyAsync(t => t.InvoiceId == invoice.Id && t.Status != PaymentTransactionStatus.Failed);
            if (hasActiveTransaction)
            {
                await lockTx.RollbackAsync();
                return (null, null, "A payment for this invoice is already in progress or has already been completed.");
            }

            tx = new PaymentTransaction
            {
                InstituteId = invoice.InstituteId,
                InvoiceId = invoice.Id,
                StudentId = invoice.StudentId,
                InitiatedByUserId = initiatedByUserId,
                Amount = remaining,
                GatewayProvider = account.GatewayProvider ?? "MockPay",
                GatewayReference = $"PENDING-{Guid.NewGuid():N}",
            };
            _db.PaymentTransactions.Add(tx);
            await _db.SaveChangesAsync();
            await lockTx.CommitAsync();
        }

        if (string.Equals(account.GatewayProvider, "Stripe", StringComparison.OrdinalIgnoreCase))
        {
            return await StartStripeCheckout(tx, account, returnPath);
        }

        // MockPay demo path: no real gateway to redirect to, so simulate its always-succeeds
        // callback in-process through the exact same signature-verified completion path.
        var secret = _encryption.Decrypt(account.ApiSecretEncrypted);
        var payload = PaymentWebhookService.BuildPayload(tx.Id, tx.GatewayReference, "success");
        var signature = PaymentGatewaySigner.Sign(secret, payload);

        var (ok, error) = await _webhook.HandleCallback(tx.Id, tx.GatewayReference, "success", signature);
        if (!ok) return (null, null, error ?? "Payment could not be completed.");

        await _db.Entry(tx).ReloadAsync();
        return (tx, null, null);
    }

    private async Task<(PaymentTransaction? Transaction, string? CheckoutUrl, string? Error)> StartStripeCheckout(
        PaymentTransaction tx, PaymentAccountSettings account, string returnPath)
    {
        var frontendOrigin = _configuration["FrontendOrigin"] ?? "http://localhost";
        var secretKey = _encryption.Decrypt(account.ApiSecretEncrypted!);

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            PaymentMethodTypes = new List<string> { "card" },
            ClientReferenceId = tx.Id.ToString(),
            LineItems = new List<SessionLineItemOptions>
            {
                new()
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "usd",
                        UnitAmount = (long)Math.Round(tx.Amount * 100, MidpointRounding.AwayFromZero),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Invoice #{tx.InvoiceId}",
                        },
                    },
                },
            },
            SuccessUrl = $"{frontendOrigin}{returnPath}?paid=1",
            CancelUrl = $"{frontendOrigin}{returnPath}?paid=0",
        };

        try
        {
            var service = new SessionService(new StripeClient(secretKey));
            var session = await service.CreateAsync(options);

            tx.GatewayReference = session.Id;
            await _db.SaveChangesAsync();

            return (tx, session.Url, null);
        }
        catch (StripeException ex)
        {
            tx.Status = PaymentTransactionStatus.Failed;
            tx.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return (null, null, $"Could not start the Stripe checkout: {ex.Message}");
        }
    }
}
