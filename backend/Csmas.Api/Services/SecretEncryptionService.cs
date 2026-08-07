using Microsoft.AspNetCore.DataProtection;

namespace Csmas.Api.Services;

/// <summary>
/// Encrypts gateway API credentials and teacher bank account numbers at rest (Phase 15), using
/// ASP.NET Core's Data Protection API. Keys persist to a mounted volume (see docker-compose.yml's
/// backend_keys volume) — without that, a container recreate would make every encrypted value
/// permanently undecryptable.
/// </summary>
public class SecretEncryptionService
{
    private readonly IDataProtector _protector;

    public SecretEncryptionService(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("Csmas.PaymentSecrets.v1");
    }

    public string Encrypt(string plaintext) => _protector.Protect(plaintext);

    public string Decrypt(string ciphertext) => _protector.Unprotect(ciphertext);
}
