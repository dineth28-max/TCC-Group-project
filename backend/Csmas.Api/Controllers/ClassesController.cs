using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/classes")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class ClassesController : TenantScopedController
{
    private readonly AppDbContext _db;

    public ClassesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<ClassSummaryResponse>>> List([FromQuery] int? branchId)
    {
        var query = _db.Classes.Include(c => c.Enrollments).Include(c => c.TeacherUser).AsQueryable();
        if (IsBranchScoped)
        {
            query = query.Where(c => c.BranchId == CurrentBranchId);
        }
        else if (branchId.HasValue)
        {
            query = query.Where(c => c.BranchId == branchId);
        }

        var classes = await query
            .Select(c => new ClassSummaryResponse(c.Id, c.Subject, c.BranchId, c.TeacherUserId, c.Enrollments.Count, c.TeacherUser == null ? null : c.TeacherUser.FullName))
            .ToListAsync();

        return Ok(classes);
    }

    [HttpPost]
    public async Task<ActionResult<ClassSummaryResponse>> Create([FromBody] CreateClassRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Subject))
        {
            return BadRequest(new { message = "Subject is required." });
        }
        if (IsBranchScoped && request.BranchId != CurrentBranchId)
        {
            return Forbid();
        }

        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId);
        if (branch is null)
        {
            return BadRequest(new { message = "Branch not found for this institute." });
        }

        var schoolClass = new Class
        {
            InstituteId = CurrentInstituteId,
            BranchId = request.BranchId,
            Subject = request.Subject.Trim(),
            TeacherUserId = request.TeacherUserId,
        };
        _db.Classes.Add(schoolClass);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(List), new ClassSummaryResponse(schoolClass.Id, schoolClass.Subject, schoolClass.BranchId, schoolClass.TeacherUserId, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ClassSummaryResponse>> Update(int id, [FromBody] CreateClassRequest request)
    {
        var schoolClass = await _db.Classes.Include(c => c.Enrollments).FirstOrDefaultAsync(c => c.Id == id);
        if (schoolClass is null) return NotFound();
        if (IsBranchScoped && schoolClass.BranchId != CurrentBranchId) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Subject)) return BadRequest(new { message = "Subject is required." });

        if (request.TeacherUserId.HasValue)
        {
            var teacherValid = await _db.Users.AnyAsync(u => u.Id == request.TeacherUserId && u.Role == Role.Teacher
                && (!IsBranchScoped || u.BranchId == CurrentBranchId));
            if (!teacherValid) return BadRequest(new { message = "Teacher not found in this branch." });
        }

        schoolClass.Subject = request.Subject.Trim();
        schoolClass.TeacherUserId = request.TeacherUserId;
        await _db.SaveChangesAsync();

        return Ok(new ClassSummaryResponse(schoolClass.Id, schoolClass.Subject, schoolClass.BranchId, schoolClass.TeacherUserId, schoolClass.Enrollments.Count));
    }

    [HttpGet("{id:int}/roster")]
    public async Task<ActionResult<ClassRosterResponse>> Roster(int id)
    {
        var schoolClass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == id);
        if (schoolClass is null) return NotFound();
        if (IsBranchScoped && schoolClass.BranchId != CurrentBranchId) return NotFound();

        var students = await _db.Enrollments
            .Where(e => e.ClassId == id)
            .Select(e => e.Student!)
            .Select(s => new StudentSummaryResponse(s.Id, s.StudentCode, s.FullName, s.Dob, s.Gender, s.ContactPhone, s.BranchId, s.Status.ToString(), s.CreatedAt))
            .ToListAsync();

        return Ok(new ClassRosterResponse(id, schoolClass.Subject, students));
    }
}
