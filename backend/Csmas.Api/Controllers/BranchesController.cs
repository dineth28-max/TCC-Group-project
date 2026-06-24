using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Branch CRUD (Phase 13). Reads stay open to any authenticated role within the caller's own
/// institute — the global EF Core tenant query filter (AppDbContext) already guarantees no branch
/// outside that institute is ever returned. Creating, editing, and deactivating a branch is
/// System Admin only: a Branch Admin manages their own branch's data, not the branch list itself.
/// </summary>
[ApiController]
[Route("api/branches")]
[Authorize]
public class BranchesController : TenantScopedController
{
    private readonly AppDbContext _db;

    public BranchesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<BranchResponse>>> List([FromQuery] string? status)
    {
        var query = _db.Branches.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BranchStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(b => b.Status == parsedStatus);
        }

        var branches = await query.OrderBy(b => b.Name).ToListAsync();
        return Ok(branches.Select(ToResponse).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BranchResponse>> GetById(int id)
    {
        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == id);
        // No tenant check written here on purpose: the global query filter already removed
        // any branch outside the caller's own institute before this query even ran.
        return branch is null ? NotFound() : Ok(ToResponse(branch));
    }

    [HttpPost]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<ActionResult<BranchResponse>> Create([FromBody] CreateBranchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Branch name is required." });
        }
        if (request.GeoLat < -90 || request.GeoLat > 90 || request.GeoLng < -180 || request.GeoLng > 180)
        {
            return BadRequest(new { message = "Geo latitude must be between -90 and 90, and longitude between -180 and 180." });
        }

        var branch = new Branch
        {
            InstituteId = CurrentInstituteId,
            Name = request.Name.Trim(),
            GeoLat = request.GeoLat,
            GeoLng = request.GeoLng,
            GeoRadiusM = request.GeoRadiusM > 0 ? request.GeoRadiusM : 100,
        };
        _db.Branches.Add(branch);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = branch.Id }, ToResponse(branch));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<ActionResult<BranchResponse>> Update(int id, [FromBody] UpdateBranchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Branch name is required." });
        }
        if (request.GeoLat < -90 || request.GeoLat > 90 || request.GeoLng < -180 || request.GeoLng > 180)
        {
            return BadRequest(new { message = "Geo latitude must be between -90 and 90, and longitude between -180 and 180." });
        }

        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == id);
        if (branch is null) return NotFound();

        branch.Name = request.Name.Trim();
        branch.GeoLat = request.GeoLat;
        branch.GeoLng = request.GeoLng;
        branch.GeoRadiusM = request.GeoRadiusM > 0 ? request.GeoRadiusM : branch.GeoRadiusM;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(branch));
    }

    [HttpPost("{id:int}/deactivate")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == id);
        if (branch is null) return NotFound();
        branch.Status = BranchStatus.Inactive; // soft delete — row is never removed
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/reactivate")]
    [Authorize(Roles = "SystemAdmin")]
    public async Task<IActionResult> Reactivate(int id)
    {
        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == id);
        if (branch is null) return NotFound();
        branch.Status = BranchStatus.Active;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static BranchResponse ToResponse(Branch b) =>
        new(b.Id, b.InstituteId, b.Name, b.GeoLat, b.GeoLng, b.GeoRadiusM, b.Status.ToString());
}
