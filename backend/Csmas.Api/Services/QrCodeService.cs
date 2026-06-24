using System.Security.Cryptography;
using System.Text;
using Csmas.Api.Auth;
using Microsoft.Extensions.Options;

namespace Csmas.Api.Services;

/// <summary>
/// Generates the signed payload printed/displayed as the student's own identity QR code
/// (FR-1.2). This is distinct from the time-limited per-session attendance QR built in Phase 3 —
/// this one identifies *who the student is*, not *that they checked into a specific session*.
/// </summary>
public class QrCodeService
{
    private readonly JwtOptions _jwtOptions;

    public QrCodeService(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    public string CreateStudentQrPayload(int studentId, int instituteId)
    {
        var raw = $"STUDENT:{instituteId}:{studentId}:{Guid.NewGuid():N}";
        var signature = Sign(raw);
        return $"{raw}:{signature}";
    }

    /// <summary>
    /// Session attendance QR: tied to one open session and valid for a short, fixed window
    /// (10 minutes) rather than forever — re-generating it issues a brand new token.
    /// </summary>
    public string CreateSessionQrToken(int sessionId, int instituteId, DateTime expiresAtUtc)
    {
        // Ticks (no colons) keep the payload safely colon-delimited end to end.
        var raw = $"SESSION:{instituteId}:{sessionId}:{expiresAtUtc.Ticks}:{Guid.NewGuid():N}";
        var signature = Sign(raw);
        return $"{raw}:{signature}";
    }

    public bool TryValidateSessionQrToken(string token, int instituteId, int sessionId, out DateTime expiresAtUtc)
    {
        expiresAtUtc = default;
        var lastColon = token.LastIndexOf(':');
        if (lastColon < 0) return false;

        var raw = token[..lastColon];
        var signature = token[(lastColon + 1)..];
        if (!string.Equals(Sign(raw), signature, StringComparison.Ordinal)) return false;

        var parts = raw.Split(':');
        if (parts.Length != 5 || parts[0] != "SESSION") return false;
        if (!int.TryParse(parts[1], out var tokenInstituteId) || tokenInstituteId != instituteId) return false;
        if (!int.TryParse(parts[2], out var tokenSessionId) || tokenSessionId != sessionId) return false;
        if (!long.TryParse(parts[3], out var ticks)) return false;
        expiresAtUtc = new DateTime(ticks, DateTimeKind.Utc);

        return expiresAtUtc >= DateTime.UtcNow;
    }

    private string Sign(string raw)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash); // full 256-bit MAC — truncating it weakens tamper-evidence for no benefit
    }
}
