namespace Csmas.Api.Dtos;

public record CreateUserRequest(
    string FullName,
    string Email,
    string Role,
    int? BranchId,
    string? Password,
    string? PhoneNumber,
    string? NationalId,
    string? Address,
    DateOnly? DateOfJoining,
    string? Subjects);

public record UpdateUserRequest(
    string FullName,
    int? BranchId,
    string Status,
    string? PhoneNumber,
    string? NationalId,
    string? Address,
    DateOnly? DateOfJoining,
    string? Subjects);

public record UserSummaryResponse(
    int Id,
    string FullName,
    string Email,
    string Role,
    int? BranchId,
    string Status,
    DateTime CreatedAt,
    bool MustChangePassword,
    string? PhoneNumber,
    string? NationalId,
    string? Address,
    DateOnly? DateOfJoining,
    string? Subjects);

public record CreateUserResponse(UserSummaryResponse User, string? TemporaryPassword);

public record ResetPasswordRequest(string? Password);

public record ResetPasswordResponse(string Message, string? TemporaryPassword);
