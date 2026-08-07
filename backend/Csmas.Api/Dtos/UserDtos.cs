namespace Csmas.Api.Dtos;

public record CreateUserRequest(string FullName, string Email, string Role, int? BranchId);

public record UpdateUserRequest(string FullName, int? BranchId, string Status);

public record UserSummaryResponse(int Id, string FullName, string Email, string Role, int? BranchId, string Status, DateTime CreatedAt);
