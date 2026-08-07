using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Teacher account management (Phase 7) and Parent account management (Phase 5 — parents need an
/// account to link before a Branch Admin can attach them to a student). Only the Teacher and Parent
/// roles are creatable here; admin account creation is out of scope for this controller.
/// New accounts get the same seeded demo password — a real "invite by email" flow is a later
/// enhancement once real SMTP credentials exist (see SmtpOptions).
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class UsersController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UsersController(AppDbContext db, IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserSummaryResponse>>> List([FromQuery] string? role, [FromQuery] string? search)
    {
        var query = _db.Users.Where(u => u.Role == Role.Teacher || u.Role == Role.Parent);

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<Role>(role, true, out var parsedRole))
        {
            query = query.Where(u => u.Role == parsedRole);
        }
        if (IsBranchScoped)
        {
            // Parent accounts aren't branch-owned, but a Branch Admin should still only manage
            // teachers in their own branch plus parents (parents are scoped via ParentLink instead).
            query = query.Where(u => u.Role == Role.Parent || u.BranchId == CurrentBranchId);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search));
        }

        var users = await query.OrderBy(u => u.FullName).ToListAsync();
        return Ok(users.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<UserSummaryResponse>> Create([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Full name and email are required." });
        }
        if (!Enum.TryParse<Role>(request.Role, true, out var role) || (role != Role.Teacher && role != Role.Parent))
        {
            return BadRequest(new { message = "Role must be Teacher or Parent." });
        }
        if (await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == request.Email))
        {
            return Conflict(new { message = "A user with this email already exists." });
        }

        int? branchId = role == Role.Teacher ? (IsBranchScoped ? CurrentBranchId : request.BranchId) : null;
        if (role == Role.Teacher)
        {
            if (branchId is null) return BadRequest(new { message = "BranchId is required for a Teacher account." });
            if (IsBranchScoped && request.BranchId is { } requested && requested != CurrentBranchId) return Forbid();
            var branchExists = await _db.Branches.AnyAsync(b => b.Id == branchId);
            if (!branchExists) return BadRequest(new { message = "Branch not found for this institute." });
        }

        var user = new User
        {
            InstituteId = CurrentInstituteId,
            Role = role,
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            BranchId = branchId,
            Status = UserStatus.Active,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, DbSeeder.DemoPassword);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(ToResponse(user));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserSummaryResponse>> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && (u.Role == Role.Teacher || u.Role == Role.Parent));
        if (user is null) return NotFound();
        if (IsBranchScoped && user.Role == Role.Teacher && user.BranchId != CurrentBranchId) return NotFound();
        if (!Enum.TryParse<UserStatus>(request.Status, true, out var status))
        {
            return BadRequest(new { message = "Status must be Active, Locked, or Inactive." });
        }

        user.FullName = request.FullName.Trim();
        user.Status = status;
        if (user.Role == Role.Teacher && request.BranchId.HasValue && !IsBranchScoped)
        {
            user.BranchId = request.BranchId;
        }

        await _db.SaveChangesAsync();
        return Ok(ToResponse(user));
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && (u.Role == Role.Teacher || u.Role == Role.Parent));
        if (user is null) return NotFound();
        if (IsBranchScoped && user.Role == Role.Teacher && user.BranchId != CurrentBranchId) return NotFound();

        user.PasswordHash = _passwordHasher.HashPassword(user, DbSeeder.DemoPassword);
        user.FailedLoginCount = 0;
        user.LockoutUntil = null;
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Password reset to the demo default ({DbSeeder.DemoPassword})." });
    }

    private static UserSummaryResponse ToResponse(User u) =>
        new(u.Id, u.FullName, u.Email, u.Role.ToString(), u.BranchId, u.Status.ToString(), u.CreatedAt);
}
