namespace Csmas.Api.Domain;

/// <summary>
/// One row per institute (Phase 15): the gateway account this institute's online payments run
/// through. ApiKey/ApiSecret are stored encrypted via Data Protection and never returned in
/// plaintext by any API response — only "is a credential currently set" booleans are exposed.
/// </summary>
public class PaymentAccountSettings
{
    public int Id { get; set; }
    public int InstituteId { get; set; }

    public string? GatewayProvider { get; set; }
    public string? AccountIdentifier { get; set; }
    public string? ApiKeyEncrypted { get; set; }
    public string? ApiSecretEncrypted { get; set; }

    /// <summary>Stripe's webhook *signing* secret (whsec_...) — distinct from ApiSecretEncrypted
    /// (the API secret key used to call Stripe, sk_...). Only meaningful when GatewayProvider is a
    /// real gateway like "Stripe"; unused by the MockPay demo path, which signs its own in-process
    /// simulated callback with ApiSecretEncrypted instead.</summary>
    public string? WebhookSecretEncrypted { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
