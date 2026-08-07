using Csmas.Api.Data;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;

namespace Csmas.Api.Controllers;

/// <summary>
/// Phase 16: receives Stripe's own webhook callbacks for the real-gateway checkout path
/// (PaymentService.StartStripeCheckout). Anonymous like /api/payments/webhook, but verified via
/// Stripe's own signature library instead of our custom HMAC scheme — Stripe signs with a secret
/// scoped to one webhook *endpoint*, and since this app is multi-tenant (one webhook endpoint
/// shared across institutes), which institute's secret to verify against has to be identified from
/// the payload first. That's safe here specifically because nothing is *trusted* from the payload
/// until after verification succeeds — it's only used to pick which key to try; a wrong/forged
/// claim just fails verification and gets rejected, the same outcome as not finding a transaction
/// at all.
/// </summary>
[ApiController]
[Route("api/payments/webhook")]
public class StripeWebhookController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly PaymentWebhookService _webhook;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(AppDbContext db, SecretEncryptionService encryption, PaymentWebhookService webhook, ILogger<StripeWebhookController> logger)
    {
        _db = db;
        _encryption = encryption;
        _webhook = webhook;
        _logger = logger;
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> Stripe()
    {
        string json;
        using (var reader = new StreamReader(Request.Body))
        {
            json = await reader.ReadToEndAsync();
        }

        Event unverifiedEvent;
        try
        {
            unverifiedEvent = EventUtility.ParseEvent(json);
        }
        catch (StripeException)
        {
            return BadRequest(new { message = "Malformed Stripe event payload." });
        }

        if (unverifiedEvent.Data.Object is not Session unverifiedSession || string.IsNullOrEmpty(unverifiedSession.ClientReferenceId))
        {
            return Ok(); // not a checkout.session event we care about
        }
        if (!int.TryParse(unverifiedSession.ClientReferenceId, out var transactionId))
        {
            return BadRequest(new { message = "Unrecognized ClientReferenceId." });
        }

        var tx = await _db.PaymentTransactions.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == transactionId);
        if (tx is null) return NotFound();

        var account = await _db.PaymentAccountSettings.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.InstituteId == tx.InstituteId);
        if (string.IsNullOrEmpty(account?.WebhookSecretEncrypted))
        {
            _logger.LogWarning("Stripe webhook received for institute {InstituteId} with no WebhookSecretEncrypted configured.", tx.InstituteId);
            return BadRequest(new { message = "Stripe webhook secret not configured for this institute." });
        }

        var webhookSecret = _encryption.Decrypt(account.WebhookSecretEncrypted);
        Event verifiedEvent;
        try
        {
            verifiedEvent = EventUtility.ConstructEvent(json, Request.Headers["Stripe-Signature"], webhookSecret);
        }
        catch (StripeException)
        {
            return BadRequest(new { message = "Invalid Stripe signature." });
        }

        if (verifiedEvent.Type == "checkout.session.completed" && verifiedEvent.Data.Object is Session verifiedSession)
        {
            var success = verifiedSession.PaymentStatus == "paid";
            var (ok, error) = await _webhook.CompleteFromVerifiedSource(transactionId, verifiedSession.Id, success);
            if (!ok) return BadRequest(new { message = error });
        }

        return Ok();
    }
}
