using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class AnnouncementsController : TenantScopedController
{
    private readonly AppDbContext _db;

    public AnnouncementsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<AnnouncementResponse>>> List()
    {
        var query = _db.Announcements.Include(a => a.Branch).AsQueryable();
        if (IsBranchScoped) query = query.Where(a => a.BranchId == null || a.BranchId == CurrentBranchId);

        var announcements = await query.OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync();
        var creatorNames = await _db.Users.IgnoreQueryFilters()
            .Where(u => announcements.Select(a => a.CreatedByUserId).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return Ok(announcements.Select(a => new AnnouncementResponse(
            a.Id, a.Title, a.Body, a.BranchId, a.Branch?.Name,
            creatorNames.GetValueOrDefault(a.CreatedByUserId, "Unknown"), a.CreatedAt)).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<AnnouncementResponse>> Create([FromBody] CreateAnnouncementRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Body))
        {
            return BadRequest(new { message = "Title and body are required." });
        }
        if (IsBranchScoped && request.BranchId.HasValue && request.BranchId != CurrentBranchId)
        {
            return Forbid();
        }

        var branchId = IsBranchScoped ? CurrentBranchId : request.BranchId;
        if (branchId.HasValue && !await _db.Branches.AnyAsync(b => b.Id == branchId))
        {
            return BadRequest(new { message = "Branch not found for this institute." });
        }

        var announcement = new Announcement
        {
            InstituteId = CurrentInstituteId,
            BranchId = branchId,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            CreatedByUserId = CurrentUserId,
        };
        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync();

        return Ok(new AnnouncementResponse(announcement.Id, announcement.Title, announcement.Body, announcement.BranchId, null, "", announcement.CreatedAt));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var announcement = await _db.Announcements.FindAsync(id);
        if (announcement is null) return NotFound();
        if (IsBranchScoped && announcement.BranchId != null && announcement.BranchId != CurrentBranchId) return NotFound();

        _db.Announcements.Remove(announcement);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
