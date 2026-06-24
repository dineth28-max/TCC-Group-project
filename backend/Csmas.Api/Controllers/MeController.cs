using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Student self-service (Phase 9 / plan.md §5.5): own QR code, read-only timetable, read-only fee
/// summary. No risk score/bucket/reasons are ever included in any response here — there isn't
/// even a field for it, by data-layer design (FR-7.6), not a UI-level omission.
/// </summary>
[ApiController]
[Route("api/me")]
[Authorize(Roles = "Student")]
public class MeController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public MeController(AppDbContext db, IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    private Task<Student?> MyStudent() =>
        _db.Students.Include(s => s.Branch)
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .FirstOrDefaultAsync(s => s.LinkedUserId == CurrentUserId);

    [HttpGet("profile")]
    public async Task<ActionResult<MyProfileResponse>> Profile()
    {
        var student = await MyStudent();
        if (student is null) return NotFound(new { message = "No student profile is linked to this account." });

        var classes = student.Enrollments.Where(e => e.Class is not null)
            .Select(e => new ClassSummaryResponse(e.Class!.Id, e.Class.Subject, e.Class.BranchId, e.Class.TeacherUserId, 0))
            .ToList();

        return Ok(new MyProfileResponse(student.Id, student.StudentCode, student.QrPayload, student.FullName, student.Branch?.Name ?? "", classes));
    }

    [HttpGet("timetable")]
    public async Task<ActionResult<List<TimetableSlotResponse>>> Timetable()
    {
        var student = await MyStudent();
        if (student is null) return NotFound(new { message = "No student profile is linked to this account." });

        var classIds = student.Enrollments.Select(e => e.ClassId).ToList();
        var slots = await _db.TimetableSlots
            .Include(t => t.Class).ThenInclude(c => c!.TeacherUser)
            .Where(t => classIds.Contains(t.ClassId))
            .ToListAsync();

        return Ok(slots.Select(t => new TimetableSlotResponse(
            t.Id, t.ClassId, t.Class?.Subject ?? string.Empty, t.BranchId, t.DayOfWeek.ToString(),
            t.StartTime.ToString("HH:mm"), t.EndTime.ToString("HH:mm"), t.Room,
            t.Class?.TeacherUserId, t.Class?.TeacherUser?.FullName)).ToList());
    }

    [HttpGet("fees")]
    public async Task<ActionResult<PortalFeeResponse>> Fees()
    {
        var student = await MyStudent();
        if (student is null) return NotFound(new { message = "No student profile is linked to this account." });

        var invoices = await _db.Invoices.Include(i => i.Student).Include(i => i.Class)
            .Where(i => i.StudentId == student.Id)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var responses = invoices.Select(i => new InvoiceResponse(
            i.Id, i.StudentId, i.Student?.FullName ?? string.Empty, i.ClassId, i.Class?.Subject ?? string.Empty,
            i.BillingPeriod, i.Amount, i.DiscountAmount, i.TotalDue, i.AmountPaid, i.Status.ToString(), i.DueDate)).ToList();

        return Ok(new PortalFeeResponse(invoices.Sum(i => i.TotalDue - i.AmountPaid), invoices.Sum(i => i.AmountPaid), responses));
    }

    /// <summary>
    /// Self-service parent linking (Phase 13): a student adds their own parent's login here,
    /// without an admin in the loop. The resulting ParentLink is identical in every respect to one
    /// an admin would create, so the Phase 5 isolation rule (a parent only ever sees students they
    /// are linked to) applies unchanged.
    /// </summary>
    [HttpGet("parents")]
    public async Task<ActionResult<List<ParentLinkResponse>>> MyParents()
    {
        var student = await MyStudent();
        if (student is null) return NotFound(new { message = "No student profile is linked to this account." });

        var links = await _db.ParentLinks.Include(p => p.ParentUser)
            .Where(p => p.StudentId == student.Id)
            .Select(p => new ParentLinkResponse(p.Id, p.ParentUserId, p.ParentUser!.FullName, p.ParentUser.Email))
            .ToListAsync();
        return Ok(links);
    }

    [HttpPost("parents")]
    public async Task<ActionResult<ParentLinkResponse>> AddMyParent([FromBody] AddMyParentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ParentName) || string.IsNullOrWhiteSpace(request.ParentEmail))
        {
            return BadRequest(new { message = "Parent name and email are required." });
        }
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters." });
        }

        var student = await MyStudent();
        if (student is null) return NotFound(new { message = "No student profile is linked to this account." });

        if (await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == request.ParentEmail))
        {
            return Conflict(new { message = "An account with this email already exists. Ask an admin to link it to your profile instead." });
        }

        var parent = new User
        {
            InstituteId = CurrentInstituteId,
            Role = Role.Parent,
            FullName = request.ParentName.Trim(),
            Email = request.ParentEmail.Trim(),
            Status = UserStatus.Active,
        };
        parent.PasswordHash = _passwordHasher.HashPassword(parent, request.Password);
        _db.Users.Add(parent);
        await _db.SaveChangesAsync();

        var link = new ParentLink { InstituteId = CurrentInstituteId, StudentId = student.Id, ParentUserId = parent.Id };
        _db.ParentLinks.Add(link);
        await _db.SaveChangesAsync();

        return Ok(new ParentLinkResponse(link.Id, parent.Id, parent.FullName, parent.Email));
    }
}
