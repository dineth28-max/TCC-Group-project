using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/sessions")]
[Authorize]
public class SessionsController : TenantScopedController
{
    private static readonly TimeSpan QrValidity = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly QrCodeService _qrCodeService;
    private readonly NotificationQueueService _notifications;

    public SessionsController(AppDbContext db, QrCodeService qrCodeService, NotificationQueueService notifications)
    {
        _db = db;
        _qrCodeService = qrCodeService;
        _notifications = notifications;
    }

    [HttpGet("my-classes")]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<List<ClassSummaryResponse>>> MyClasses()
    {
        var classes = await _db.Classes.Include(c => c.Enrollments)
            .Where(c => c.TeacherUserId == CurrentUserId)
            .Select(c => new ClassSummaryResponse(c.Id, c.Subject, c.BranchId, c.TeacherUserId, c.Enrollments.Count, null))
            .ToListAsync();

        return Ok(classes);
    }

    [HttpGet]
    [Authorize(Roles = "Teacher,BranchAdmin,SystemAdmin")]
    public async Task<ActionResult<List<SessionResponse>>> List([FromQuery] int? classId)
    {
        var query = _db.Sessions.Include(s => s.Class).AsQueryable();
        if (classId.HasValue) query = query.Where(s => s.ClassId == classId);
        if (User.IsInRole("Teacher")) query = query.Where(s => s.TeacherUserId == CurrentUserId);
        else if (IsBranchScoped) query = query.Where(s => s.BranchId == CurrentBranchId);

        var sessions = await query.OrderByDescending(s => s.StartedAt).Take(50).ToListAsync();
        return Ok(sessions.Select(ToResponse).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<SessionResponse>> Create([FromBody] CreateSessionRequest request)
    {
        var klass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == request.ClassId);
        if (klass is null) return NotFound(new { message = "Class not found." });
        if (klass.TeacherUserId != CurrentUserId) return Forbid();

        var session = new Session
        {
            InstituteId = CurrentInstituteId,
            BranchId = klass.BranchId,
            ClassId = klass.Id,
            TeacherUserId = CurrentUserId,
            GraceMinutes = request.GraceMinutes,
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();

        IssueQr(session);
        await _db.SaveChangesAsync();

        session.Class = klass;
        return CreatedAtAction(nameof(GetById), new { id = session.Id }, ToResponse(session));
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Teacher,BranchAdmin,SystemAdmin")]
    public async Task<ActionResult<SessionResponse>> GetById(int id)
    {
        var session = await _db.Sessions.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        if (session is null || !CanView(session)) return NotFound();
        return Ok(ToResponse(session));
    }

    [HttpPost("{id:int}/qr/regenerate")]
    [Authorize(Roles = "Teacher")]
    public async Task<ActionResult<SessionResponse>> RegenerateQr(int id)
    {
        var session = await _db.Sessions.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return NotFound();
        if (session.TeacherUserId != CurrentUserId) return Forbid();
        if (session.Status != SessionStatus.Open) return BadRequest(new { message = "Session is closed." });

        IssueQr(session);
        await _db.SaveChangesAsync();
        return Ok(ToResponse(session));
    }

    [HttpGet("classes/{classId:int}/performance")]
    [Authorize(Roles = "Teacher,BranchAdmin,SystemAdmin")]
    public async Task<ActionResult<ClassPerformanceResponse>> Performance(int classId, [FromQuery] int days = 28)
    {
        var klass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
        if (klass is null) return NotFound();
        if (User.IsInRole("Teacher") && klass.TeacherUserId != CurrentUserId) return Forbid();
        if (!User.IsInRole("Teacher") && IsBranchScoped && klass.BranchId != CurrentBranchId) return NotFound();

        var since = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-days);
        var closedSessionIds = await _db.Sessions
            .Where(s => s.ClassId == classId && s.Status == SessionStatus.Closed && s.SessionDate >= since)
            .Select(s => s.Id)
            .ToListAsync();

        var students = await _db.Enrollments
            .Where(e => e.ClassId == classId)
            .Include(e => e.Student)
            .Where(e => e.Student != null && e.Student.Status == StudentStatus.Active)
            .Select(e => e.Student!)
            .ToListAsync();

        var rows = new List<ClassPerformanceRow>();
        foreach (var student in students)
        {
            if (closedSessionIds.Count == 0)
            {
                rows.Add(new ClassPerformanceRow(student.Id, student.FullName, 0, 0));
                continue;
            }
            var presentOrLate = await _db.Attendances
                .CountAsync(a => closedSessionIds.Contains(a.SessionId) && a.StudentId == student.Id && a.Status != AttendanceStatus.Absent);
            var rate = Math.Round(100m * presentOrLate / closedSessionIds.Count, 1);
            rows.Add(new ClassPerformanceRow(student.Id, student.FullName, closedSessionIds.Count, rate));
        }

        return Ok(new ClassPerformanceResponse(classId, klass.Subject, days, rows.OrderByDescending(r => r.AttendanceRatePercent).ToList()));
    }

    [HttpGet("{id:int}/live")]
    [Authorize(Roles = "Teacher,BranchAdmin,SystemAdmin")]
    public async Task<ActionResult<LiveAttendanceResponse>> Live(int id)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session is null || !CanView(session)) return NotFound();

        var enrolledStudents = await _db.Enrollments
            .Where(e => e.ClassId == session.ClassId)
            .Include(e => e.Student)
            .Where(e => e.Student != null && e.Student.Status == StudentStatus.Active)
            .Select(e => e.Student!)
            .ToListAsync();

        var attendances = await _db.Attendances
            .Where(a => a.SessionId == id)
            .ToDictionaryAsync(a => a.StudentId);

        var rows = enrolledStudents.Select(s => attendances.TryGetValue(s.Id, out var att)
                ? new LiveAttendanceRow(s.Id, s.FullName, att.Status.ToString(), att.CheckedInAt)
                : new LiveAttendanceRow(s.Id, s.FullName, "NotYet", null))
            .ToList();

        return Ok(new LiveAttendanceResponse(
            session.Id,
            session.Status.ToString(),
            enrolledStudents.Count,
            rows.Count(r => r.Status == "Present"),
            rows.Count(r => r.Status == "Late"),
            rows.Count(r => r.Status == "Absent"),
            rows.Count(r => r.Status == "NotYet"),
            rows));
    }

    [HttpPost("{id:int}/attendance/{studentId:int}/override")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Override(int id, int studentId, [FromBody] ManualOverrideRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new { message = "A reason is required for a manual attendance override." });
        }
        if (!Enum.TryParse<AttendanceStatus>(request.Status, true, out var status))
        {
            return BadRequest(new { message = "Status must be Present, Late, or Absent." });
        }

        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return NotFound(new { message = "Session not found." });
        if (session.TeacherUserId != CurrentUserId) return Forbid();

        var enrolled = await _db.Enrollments.AnyAsync(e => e.ClassId == session.ClassId && e.StudentId == studentId);
        if (!enrolled) return NotFound(new { message = "Student is not enrolled in this class." });

        var attendance = await _db.Attendances.FirstOrDefaultAsync(a => a.SessionId == id && a.StudentId == studentId);
        if (attendance is null)
        {
            attendance = new Attendance { InstituteId = session.InstituteId, SessionId = id, StudentId = studentId };
            _db.Attendances.Add(attendance);
        }

        attendance.Status = status;
        attendance.Method = AttendanceMethod.ManualOverride;
        attendance.OverrideReason = request.Reason.Trim();
        attendance.CheckedInAt = DateTime.UtcNow;

        if (status == AttendanceStatus.Absent)
        {
            await QueueAbsenceNotifications(session, studentId);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/close")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Close(int id)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return NotFound();
        if (session.TeacherUserId != CurrentUserId) return Forbid();
        if (session.Status != SessionStatus.Open) return BadRequest(new { message = "Session is already closed." });

        // Bound by enrollment date so a student enrolled after the session started isn't
        // auto-marked absent for a session they were never expected to attend.
        var enrolledStudentIds = await _db.Enrollments
            .Where(e => e.ClassId == session.ClassId && e.EnrolledAt <= session.StartedAt)
            .Select(e => e.StudentId)
            .ToListAsync();
        var alreadyMarked = await _db.Attendances
            .Where(a => a.SessionId == id)
            .Select(a => a.StudentId)
            .ToListAsync();

        foreach (var studentId in enrolledStudentIds.Except(alreadyMarked))
        {
            _db.Attendances.Add(new Attendance
            {
                InstituteId = session.InstituteId,
                SessionId = id,
                StudentId = studentId,
                Status = AttendanceStatus.Absent,
                Method = AttendanceMethod.AutoAbsent,
                CheckedInAt = null,
            });
            await QueueAbsenceNotifications(session, studentId);
        }

        session.Status = SessionStatus.Closed;
        session.ClosedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task QueueAbsenceNotifications(Session session, int studentId)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId);
        if (student is null) return;

        var subject = await _db.Classes.Where(c => c.Id == session.ClassId).Select(c => c.Subject).FirstOrDefaultAsync() ?? "";

        var parentUserIds = await _db.ParentLinks
            .Where(p => p.StudentId == studentId)
            .Select(p => p.ParentUserId)
            .ToListAsync();

        var placeholders = new Dictionary<string, string>
        {
            ["StudentName"] = student.FullName,
            ["Subject"] = subject,
            ["Date"] = session.SessionDate.ToString("yyyy-MM-dd"),
            ["AttendanceRate"] = student.AttendanceRate?.ToString("0.0") ?? "N/A",
        };

        foreach (var parentUserId in parentUserIds)
        {
            await _notifications.Enqueue(session.InstituteId, NotificationEventType.AttendanceAbsent, parentUserId, placeholders);
        }
    }

    private bool CanView(Session session) =>
        User.IsInRole("Teacher") ? session.TeacherUserId == CurrentUserId : !IsBranchScoped || session.BranchId == CurrentBranchId;

    private void IssueQr(Session session)
    {
        var expiresAt = DateTime.UtcNow.Add(QrValidity);
        session.QrToken = _qrCodeService.CreateSessionQrToken(session.Id, session.InstituteId, expiresAt);
        session.QrExpiresAt = expiresAt;
    }

    private static SessionResponse ToResponse(Session s) => new(
        s.Id, s.ClassId, s.Class?.Subject ?? string.Empty, s.BranchId, s.TeacherUserId,
        s.SessionDate, s.StartedAt, s.ClosedAt, s.Status.ToString(), s.GraceMinutes, s.QrToken, s.QrExpiresAt);
}
