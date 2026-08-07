using ClosedXML.Excel;
using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly QrCodeService _qrCodeService;

    public AttendanceController(AppDbContext db, QrCodeService qrCodeService)
    {
        _db = db;
        _qrCodeService = qrCodeService;
    }

    [HttpPost("check-in")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<CheckInResponse>> CheckIn([FromBody] CheckInRequest request)
    {
        var student = await _db.Students.Include(s => s.Branch).FirstOrDefaultAsync(s => s.LinkedUserId == CurrentUserId);
        if (student is null)
        {
            return BadRequest(new { message = "No student profile is linked to this account." });
        }

        var lastColon = request.QrToken.LastIndexOf(':');
        var sessionIdPart = lastColon >= 0 ? request.QrToken.Split(':').ElementAtOrDefault(2) : null;
        if (sessionIdPart is null || !int.TryParse(sessionIdPart, out var sessionId))
        {
            return BadRequest(new { message = "Malformed QR token." });
        }

        var session = await _db.Sessions.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null) return NotFound(new { message = "Session not found." });
        if (session.Status != SessionStatus.Open) return BadRequest(new { message = "This session is no longer open." });

        if (!_qrCodeService.TryValidateSessionQrToken(request.QrToken, CurrentInstituteId, sessionId, out _))
        {
            return BadRequest(new { message = "QR code is invalid or has expired. Ask your teacher to regenerate it." });
        }

        var enrolled = await _db.Enrollments.AnyAsync(e => e.ClassId == session.ClassId && e.StudentId == student.Id);
        if (!enrolled) return BadRequest(new { message = "You are not enrolled in this class." });

        var branch = student.Branch ?? await _db.Branches.FirstAsync(b => b.Id == session.BranchId);
        var distance = GeoService.DistanceMeters(branch.GeoLat, branch.GeoLng, request.Lat, request.Lng);
        if (distance > branch.GeoRadiusM)
        {
            // A rejected-by-distance check-in is a normal business outcome, not a malformed
            // request — return 200 so the frontend's success path (which reads distanceMeters)
            // actually receives it instead of falling into the generic error handler.
            return Ok(new CheckInResponse("OutOfRange", distance));
        }

        var alreadyCheckedIn = await _db.Attendances.AnyAsync(a => a.SessionId == sessionId && a.StudentId == student.Id);
        if (alreadyCheckedIn) return BadRequest(new { message = "You have already checked in to this session." });

        var isLate = DateTime.UtcNow > session.StartedAt.AddMinutes(session.GraceMinutes);
        var status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;

        _db.Attendances.Add(new Attendance
        {
            InstituteId = session.InstituteId,
            SessionId = sessionId,
            StudentId = student.Id,
            Status = status,
            Method = AttendanceMethod.QrScan,
            CheckedInAt = DateTime.UtcNow,
            GeoLat = request.Lat,
            GeoLng = request.Lng,
        });

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Two near-simultaneous check-ins both passed the alreadyCheckedIn check above before
            // either committed — the unique (SessionId, StudentId) index caught the race. Surface
            // it as the same friendly message instead of a raw 500.
            return BadRequest(new { message = "You have already checked in to this session." });
        }

        return Ok(new CheckInResponse(status.ToString(), distance));
    }

    [HttpGet("flagged")]
    [Authorize(Roles = "BranchAdmin,SystemAdmin")]
    public async Task<ActionResult<List<AttendanceFlagRow>>> Flagged([FromQuery] decimal? threshold)
    {
        var effectiveThreshold = threshold
            ?? (await _db.Institutes.Where(i => i.Id == CurrentInstituteId).Select(i => i.AttendanceThresholdPercent).FirstOrDefaultAsync());
        if (effectiveThreshold <= 0) effectiveThreshold = 75;

        await RecomputeAttendanceRates(effectiveThreshold);

        var query = _db.Students.Where(s => s.IsAttendanceFlagged);
        if (IsBranchScoped) query = query.Where(s => s.BranchId == CurrentBranchId);

        var flagged = await query
            .Select(s => new AttendanceFlagRow(s.Id, s.FullName, s.BranchId, s.AttendanceRate ?? 0))
            .ToListAsync();

        return Ok(flagged);
    }

    private async Task RecomputeAttendanceRates(decimal threshold)
    {
        var students = await _db.Students.Where(s => s.Status == StudentStatus.Active).ToListAsync();
        foreach (var student in students)
        {
            // Only count sessions held on/after the student's enrollment date — otherwise a
            // newly-enrolled student is counted absent for sessions held before they joined,
            // wrongly tanking their rate and flagging them the moment they enroll.
            var sessionIds = await _db.Enrollments
                .Where(e => e.StudentId == student.Id)
                .Join(_db.Sessions, e => e.ClassId, s => s.ClassId, (e, s) => new { e.EnrolledAt, Session = s })
                .Where(x => x.Session.Status == SessionStatus.Closed && x.Session.StartedAt >= x.EnrolledAt)
                .Select(x => x.Session.Id)
                .ToListAsync();

            if (sessionIds.Count == 0)
            {
                student.AttendanceRate = null;
                student.IsAttendanceFlagged = false;
                continue;
            }

            var presentOrLate = await _db.Attendances
                .CountAsync(a => sessionIds.Contains(a.SessionId) && a.StudentId == student.Id && a.Status != AttendanceStatus.Absent);

            var rate = Math.Round(100m * presentOrLate / sessionIds.Count, 1);
            student.AttendanceRate = rate;
            student.IsAttendanceFlagged = rate < threshold;
        }
        await _db.SaveChangesAsync();
    }

    [HttpGet("export")]
    [Authorize(Roles = "BranchAdmin,SystemAdmin")]
    public async Task<IActionResult> Export([FromQuery] int year, [FromQuery] int month, [FromQuery] string format = "xlsx")
    {
        var sessionsQuery = _db.Sessions
            .Include(s => s.Class)
            .Where(s => s.SessionDate.Year == year && s.SessionDate.Month == month);
        if (IsBranchScoped) sessionsQuery = sessionsQuery.Where(s => s.BranchId == CurrentBranchId);

        var sessions = await sessionsQuery.ToListAsync();
        var sessionIds = sessions.Select(s => s.Id).ToList();

        var records = await _db.Attendances
            .Where(a => sessionIds.Contains(a.SessionId))
            .Include(a => a.Student)
            .Include(a => a.Session)
            .ToListAsync();

        var rows = records
            .OrderBy(r => r.Student!.FullName)
            .ThenBy(r => r.Session!.SessionDate)
            .Select(r => new
            {
                Student = r.Student!.FullName,
                Subject = sessions.First(s => s.Id == r.SessionId).Class?.Subject ?? "",
                Date = r.Session!.SessionDate,
                Status = r.Status.ToString(),
            })
            .ToList();

        var fileName = $"attendance-{year:D4}-{month:D2}";

        if (format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
        {
            var pdfBytes = BuildAttendancePdf(year, month, rows);
            return File(pdfBytes, "application/pdf", $"{fileName}.pdf");
        }

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Attendance");
        sheet.Cell(1, 1).Value = "Student";
        sheet.Cell(1, 2).Value = "Subject";
        sheet.Cell(1, 3).Value = "Date";
        sheet.Cell(1, 4).Value = "Status";
        var rowIndex = 2;
        foreach (var row in rows)
        {
            sheet.Cell(rowIndex, 1).Value = row.Student;
            sheet.Cell(rowIndex, 2).Value = row.Subject;
            sheet.Cell(rowIndex, 3).Value = row.Date.ToString("yyyy-MM-dd");
            sheet.Cell(rowIndex, 4).Value = row.Status;
            rowIndex++;
        }
        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{fileName}.xlsx");
    }

    private static byte[] BuildAttendancePdf(int year, int month, IEnumerable<dynamic> rows)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(30);
                page.Header().Text($"Monthly Attendance Report — {year:D4}-{month:D2}").FontSize(16).Bold();
                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(2);
                        columns.RelativeColumn(1);
                        columns.RelativeColumn(1);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Text("Student").Bold();
                        header.Cell().Text("Subject").Bold();
                        header.Cell().Text("Date").Bold();
                        header.Cell().Text("Status").Bold();
                    });

                    foreach (var row in rows)
                    {
                        table.Cell().Text((string)row.Student);
                        table.Cell().Text((string)row.Subject);
                        table.Cell().Text(((DateOnly)row.Date).ToString("yyyy-MM-dd"));
                        table.Cell().Text((string)row.Status);
                    }
                });
            });
        });

        return document.GeneratePdf();
    }
}
