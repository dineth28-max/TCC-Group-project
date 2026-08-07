namespace Csmas.Api.Domain;

public class User
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public Institute? Institute { get; set; }
    public int? BranchId { get; set; }
    public Branch? Branch { get; set; }

    public Role Role { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserStatus Status { get; set; } = UserStatus.Active;

    public int FailedLoginCount { get; set; }
    public DateTime? LockoutUntil { get; set; }

    /// <summary>Set whenever an admin creates or resets this account's password (Phase 16) — the
    /// login flow forces a password-change screen before any dashboard loads while this is true,
    /// so an admin-set or system-generated credential is never the account's permanent password.</summary>
    public bool MustChangePassword { get; set; }

    // Teacher profile fields (Phase 16) — nullable since Parent accounts don't use them.
    public string? PhoneNumber { get; set; }
    public string? NationalId { get; set; }
    public string? Address { get; set; }
    public DateOnly? DateOfJoining { get; set; }
    public string? Subjects { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
