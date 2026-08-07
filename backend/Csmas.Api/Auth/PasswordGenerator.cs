using System.Security.Cryptography;

namespace Csmas.Api.Auth;

/// <summary>
/// Generates one-time passwords for admin-created Teacher/Parent accounts (Phase 16), replacing the
/// shared literal constant every such account used to be hashed to. Excludes visually ambiguous
/// characters (0/O, 1/I/l) since this is meant to be read off a screen and typed once.
/// </summary>
public static class PasswordGenerator
{
    private const string Chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

    public static string Generate(int length = 12)
    {
        var bytes = RandomNumberGenerator.GetBytes(length);
        var chars = new char[length];
        for (var i = 0; i < length; i++) chars[i] = Chars[bytes[i] % Chars.Length];
        return new string(chars);
    }
}
