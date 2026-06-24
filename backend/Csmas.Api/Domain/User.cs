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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
