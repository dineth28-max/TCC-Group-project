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
    int? BranchId);
