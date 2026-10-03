namespace Csmas.Api.Dtos;

public record LoginRequest(string Email, string Password);

public record LoginResponse(string AccessToken);

public record MeResponse(
    int Id,
    string FullName,
    string Email,
    string Role,
    int InstituteId,
    string InstituteName,
    int? BranchId,
    string? BranchName,
    string? PhoneNumber,
    bool MustChangePassword);

/// <summary>Self-service profile edit. Email is deliberately not editable here — it is the login
/// identifier, so changing it is an admin action.</summary>
public record UpdateProfileRequest(string FullName, string? PhoneNumber);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
