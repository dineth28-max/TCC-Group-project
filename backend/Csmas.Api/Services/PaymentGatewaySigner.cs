using System.Security.Cryptography;
using System.Text;

namespace Csmas.Api.Services;

/// <summary>
/// HMAC-SHA256 signing/verification for gateway webhook callbacks (Phase 15). A real gateway would
/// sign its webhook payload with the shared API secret so we can prove the callback actually came
/// from it; PaymentService signs the same way when simulating that callback in-process, so the same
/// verification code in PaymentWebhookService runs unconditionally either way.
/// </summary>
public static class PaymentGatewaySigner
{
    public static string Sign(string apiSecret, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash);
    }

    public static bool Verify(string apiSecret, string payload, string signature)
    {
        var expected = Sign(apiSecret, payload);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(signature);
        // FixedTimeEquals requires equal-length inputs — a length mismatch is already a definite
        // forgery, so it's safe to short-circuit without comparing (no secret-dependent branching).
        if (expectedBytes.Length != actualBytes.Length) return false;
        return CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }
}
