using Csmas.Api.Data;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Phase 16: read-only view of AuditLogService's entries — who changed a sensitive setting or
/// credential, and when. Institute-scoped only (no branch field on the entries); both admin roles
/// can read it since both can trigger audited actions (e.g. a BranchAdmin marking a teacher
/// earning paid).
/// </summary>
[ApiController]
[Route("api/admin/audit-log")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class AuditLogController : TenantScopedController
{
    private readonly AppDbContext _db;

    public AuditLogController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<AuditLogRow>>> List()
    {
        var entries = await _db.AuditLogEntries.Include(a => a.ActorUser)
            .OrderByDescending(a => a.CreatedAt)
            .Take(200)
            .ToListAsync();
        var rows = entries.Select(a => new AuditLogRow(a.Id, a.ActorUser?.FullName ?? "Unknown", a.Action, a.TargetDescription, a.CreatedAt)).ToList();
        return Ok(rows);
    }
}
