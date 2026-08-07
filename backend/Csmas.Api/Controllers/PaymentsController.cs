using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Csmas.Api.Controllers;

/// <summary>
/// Phase 15: the gateway-facing webhook. Deliberately has no [Authorize] — a real gateway's
/// server calls this directly with no user session, authenticating itself only via
/// X-Gateway-Signature (verified against the institute's configured API secret in
/// PaymentWebhookService). Student/Parent payment initiation lives in MeController/PortalController
/// instead, reusing their existing own-data ownership checks rather than duplicating them here.
/// </summary>
[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentWebhookService _webhook;

    public PaymentsController(PaymentWebhookService webhook)
    {
        _webhook = webhook;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] GatewayWebhookRequest request, [FromHeader(Name = "X-Gateway-Signature")] string? signature)
    {
        if (string.IsNullOrEmpty(signature)) return BadRequest(new { message = "Missing X-Gateway-Signature header." });

        var (ok, error) = await _webhook.HandleCallback(request.TransactionId, request.GatewayReference, request.Status, signature);
        if (!ok) return BadRequest(new { message = error });
        return NoContent();
    }
}
