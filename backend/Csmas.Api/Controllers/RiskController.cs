using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// F7 (plan.md §14.6) — the High-Risk Students panel. Admin/BranchAdmin only; Parent/Student
/// accounts have no route into this controller and no risk field appears in any of their
/// endpoints' DTOs (PortalController, StudentView-facing responses), by construction.
/// </summary>
[ApiController]
[Route("api/admin/risk-students")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class RiskController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly RiskScoringService _riskScoring;

    public RiskController(AppDbContext db, RiskScoringService riskScoring)
    {
        _db = db;
        _riskScoring = riskScoring;
    }

    [HttpGet]
    public async Task<ActionResult<List<RiskStudentResponse>>> List(
        [FromQuery] int? branchId, [FromQuery] int? classId, [FromQuery] string? riskLevel)
    {
        var query = _db.RiskScores.Include(r => r.Student).ThenInclude(s => s!.Branch).AsQueryable();

        if (IsBranchScoped) query = query.Where(r => r.Student!.BranchId == CurrentBranchId);
        else if (branchId.HasValue) query = query.Where(r => r.Student!.BranchId == branchId.Value);

        if (!string.IsNullOrWhiteSpace(riskLevel) && Enum.TryParse<RiskLevel>(riskLevel, true, out var level))
        {
            query = query.Where(r => r.Level == level);
        }

        if (classId.HasValue)
        {
            var studentIdsInClass = _db.Enrollments.Where(e => e.ClassId == classId.Value).Select(e => e.StudentId);
            query = query.Where(r => studentIdsInClass.Contains(r.StudentId));
        }

        var rows = await query.OrderByDescending(r => r.Score).ToListAsync();

        return Ok(rows.Select(r => ToResponse(r, r.Student!)).ToList());
    }

    /// <summary>
    /// Runs the AI model right now for one student (admin-triggered lookup by ID/name via the
    /// frontend's search-then-predict flow) instead of waiting for the next attendance/payment
    /// event to trigger a recompute.
    /// </summary>
    [HttpPost("{studentId:int}/predict")]
    public async Task<ActionResult<RiskStudentResponse>> PredictNow(int studentId)
    {
        var student = await _db.Students.Include(s => s.Branch).FirstOrDefaultAsync(s => s.Id == studentId);
        if (student is null) return NotFound(new { message = "Student not found." });
        if (IsBranchScoped && student.BranchId != CurrentBranchId) return NotFound(new { message = "Student not found." });

        var succeeded = await _riskScoring.RecomputeForStudent(studentId);
        if (!succeeded)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "The AI service is unavailable right now — could not compute a fresh prediction." });
        }

        var riskScore = await _db.RiskScores.FirstAsync(r => r.StudentId == studentId);

        return Ok(ToResponse(riskScore, student));
    }

    /// <summary>
    /// Runs the AI model for every student currently enrolled in one class — the "select a class,
    /// predict the whole class" flow. Exactly the same guarantee as the single-student endpoint:
    /// each student's score comes from its own real call to RiskScoringService.RecomputeForStudent
    /// (which only ever persists a score after a successful model response, see the invariant
    /// comment in RiskScoringService.cs) — nothing here computes or fabricates a score itself, it
    /// only tallies how many of those real calls succeeded vs. failed (e.g. AI service briefly
    /// unavailable mid-batch) and returns the fresh rows for the ones that did.
    /// </summary>
    [HttpPost("predict-class/{classId:int}")]
    public async Task<ActionResult<RiskClassPredictionResponse>> PredictClass(int classId)
    {
        var schoolClass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
        if (schoolClass is null) return NotFound(new { message = "Class not found." });
        if (IsBranchScoped && schoolClass.BranchId != CurrentBranchId) return NotFound(new { message = "Class not found." });

        var studentIds = await _db.Enrollments
            .Where(e => e.ClassId == classId)
            .Select(e => e.StudentId)
            .ToListAsync();

        var succeededIds = new List<int>();
        foreach (var studentId in studentIds)
        {
            if (await _riskScoring.RecomputeForStudent(studentId))
            {
                succeededIds.Add(studentId);
            }
        }

        var rows = await _db.RiskScores
            .Include(r => r.Student).ThenInclude(s => s!.Branch)
            .Where(r => succeededIds.Contains(r.StudentId))
            .OrderByDescending(r => r.Score)
            .ToListAsync();

        return Ok(new RiskClassPredictionResponse(
            classId,
            schoolClass.Subject,
            studentIds.Count,
            succeededIds.Count,
            studentIds.Count - succeededIds.Count,
            rows.Select(r => ToResponse(r, r.Student!)).ToList()));
    }

    private static RiskStudentResponse ToResponse(RiskScore riskScore, Student student) => new(
        student.Id,
        student.StudentCode,
        student.FullName,
        student.BranchId,
        student.Branch!.Name,
        riskScore.Score,
        riskScore.Level.ToString(),
        new[] { riskScore.TopFactor1, riskScore.TopFactor2, riskScore.TopFactor3 }.Where(f => f != null).Select(f => f!).ToList(),
        riskScore.ComputedAt);
}
