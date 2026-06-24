namespace Csmas.Api.Services;

/// <summary>
/// Bound from the "Smtp" config section. Ships with placeholder/dummy values so the Notification
/// Engine is fully wired end-to-end before real mailbox credentials exist — sends will fail and
/// land in the delivery log as "Failed" (the documented Phase 6 behaviour), which is itself proof
/// that a core action (e.g. an absence record) is never blocked by a notification failure.
/// Swap in real Host/Username/Password/FromAddress later; no code change needed.
/// </summary>
public class SmtpOptions
{
    public string Host { get; set; } = "smtp.example.invalid";
    public int Port { get; set; } = 587;
    public string User { get; set; } = "dummy@example.invalid";
    public string Pass { get; set; } = "dummy-password";
    public string FromAddress { get; set; } = "noreply@csmas.local";
    public string FromName { get; set; } = "CSMAS";
    public bool UseSsl { get; set; } = true;
}
