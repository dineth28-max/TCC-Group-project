namespace Csmas.Api.Dtos;

public record InstituteSettingsResponse(
    int Id,
    string Name,
    string? Address,
    string? ContactEmail,
    string? LogoUrl,
    string? ThemeColor,
    decimal AttendanceThresholdPercent);

public record UpdateInstituteSettingsRequest(
    string Name,
    string? Address,
    string? ContactEmail,
    string? LogoUrl,
    string? ThemeColor,
    decimal AttendanceThresholdPercent);
