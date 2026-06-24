using Csmas.Api.Data;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Institute branding and configuration (Phase 13): name/address/contact, logo, theme color, and
/// the attendance-flagging threshold percentage Phase 3's threshold job previously only accepted
/// as a hardcoded/query-string default. System Admin only — a single institute-wide settings row,
/// not a Branch Admin concern.
/// </summary>
[ApiController]
[Route("api/settings")]
[Authorize(Roles = "SystemAdmin")]
public class SettingsController : TenantScopedController
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<InstituteSettingsResponse>> Get()
    {
        var institute = await _db.Institutes.FirstAsync(i => i.Id == CurrentInstituteId);
        return Ok(ToResponse(institute));
    }

    [HttpPut]
    public async Task<ActionResult<InstituteSettingsResponse>> Update([FromBody] UpdateInstituteSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Institute name is required." });
        }
        if (request.AttendanceThresholdPercent < 0 || request.AttendanceThresholdPercent > 100)
        {
            return BadRequest(new { message = "Attendance threshold must be between 0 and 100." });
        }

        var institute = await _db.Institutes.FirstAsync(i => i.Id == CurrentInstituteId);
        institute.Name = request.Name.Trim();
        institute.Address = request.Address;
        institute.ContactEmail = request.ContactEmail;
        institute.LogoUrl = request.LogoUrl;
        institute.ThemeColor = request.ThemeColor;
        institute.AttendanceThresholdPercent = request.AttendanceThresholdPercent;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(institute));
    }

    private static InstituteSettingsResponse ToResponse(Domain.Institute i) =>
        new(i.Id, i.Name, i.Address, i.ContactEmail, i.LogoUrl, i.ThemeColor, i.AttendanceThresholdPercent);
}
