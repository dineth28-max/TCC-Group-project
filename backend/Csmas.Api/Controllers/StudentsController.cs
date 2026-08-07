using System.Globalization;
using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using CsvHelper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class StudentsController : TenantScopedController
{
    private static readonly string[] AllowedDocExtensions = { ".jpg", ".jpeg", ".png", ".pdf" };
    private const int MaxFileSizeBytes = 5 * 1024 * 1024;

    private readonly AppDbContext _db;
    private readonly QrCodeService _qrCodeService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StudentsController> _logger;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly KpiCacheService _kpiCache;

    public StudentsController(AppDbContext db, QrCodeService qrCodeService, IConfiguration configuration, ILogger<StudentsController> logger, IPasswordHasher<User> passwordHasher, KpiCacheService kpiCache)
    {
        _db = db;
        _qrCodeService = qrCodeService;
        _configuration = configuration;
        _logger = logger;
        _passwordHasher = passwordHasher;
        _kpiCache = kpiCache;
    }

    private string UploadsRoot => _configuration["Uploads:RootPath"] ?? "/app/uploads";

    [HttpGet]
    public async Task<ActionResult<List<StudentSummaryResponse>>> List([FromQuery] string? search, [FromQuery] int? branchId, [FromQuery] string? status)
    {
        var query = _db.Students.AsQueryable();

        if (IsBranchScoped)
        {
            // A Branch Admin can never see another branch's roster, regardless of what was requested.
            query = query.Where(s => s.BranchId == CurrentBranchId);
        }
        else if (branchId.HasValue)
        {
            query = query.Where(s => s.BranchId == branchId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s => s.FullName.Contains(search) || s.StudentCode.Contains(search));
        }
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<StudentStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(s => s.Status == parsedStatus);
        }

        var students = await query
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new StudentSummaryResponse(
                s.Id, s.StudentCode, s.FullName, s.Dob, s.Gender, s.ContactPhone, s.BranchId, s.Status.ToString(), s.CreatedAt))
            .ToListAsync();

        return Ok(students);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var query = _db.Students.AsQueryable();
        if (IsBranchScoped) query = query.Where(s => s.BranchId == CurrentBranchId);

        var students = await query.OrderBy(s => s.FullName).ToListAsync();

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Students");
        string[] headers = { "Student Code", "Full Name", "DOB", "Gender", "Contact Phone", "Branch", "Status" };
        for (var col = 0; col < headers.Length; col++) sheet.Cell(1, col + 1).Value = headers[col];

        var row = 2;
        foreach (var s in students)
        {
            sheet.Cell(row, 1).Value = s.StudentCode;
            sheet.Cell(row, 2).Value = s.FullName;
            sheet.Cell(row, 3).Value = s.Dob.ToString("yyyy-MM-dd");
            sheet.Cell(row, 4).Value = s.Gender ?? "";
            sheet.Cell(row, 5).Value = s.ContactPhone ?? "";
            sheet.Cell(row, 6).Value = s.BranchId;
            sheet.Cell(row, 7).Value = s.Status.ToString();
            row++;
        }
        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "students.xlsx");
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StudentDetailResponse>> GetById(int id)
    {
        var student = await _db.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .Include(s => s.Documents)
            .Include(s => s.LinkedUser)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (student is null || !CanAccess(student)) return NotFound();

        return Ok(ToDetail(student));
    }

    [HttpPost]
    public async Task<ActionResult<StudentDetailResponse>> Create([FromBody] CreateStudentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { message = "Full name is required." });
        }
        var hasLoginEmail = !string.IsNullOrWhiteSpace(request.LoginEmail);
        var hasLoginPassword = !string.IsNullOrWhiteSpace(request.LoginPassword);
        if (hasLoginEmail != hasLoginPassword)
        {
            return BadRequest(new { message = "Both a login email and a login password are required to create a student login, or leave both blank." });
        }
        if (hasLoginPassword && request.LoginPassword!.Length < 8)
        {
            return BadRequest(new { message = "Login password must be at least 8 characters." });
        }
        if (hasLoginEmail && await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == request.LoginEmail))
        {
            return Conflict(new { message = "A user with this login email already exists." });
        }

        // A Branch Admin can only ever register students into their own branch.
        var targetBranchId = IsBranchScoped ? CurrentBranchId!.Value : request.BranchId;
        if (IsBranchScoped && request.BranchId != CurrentBranchId)
        {
            return Forbid();
        }

        var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == targetBranchId);
        if (branch is null)
        {
            return BadRequest(new { message = "Branch not found for this institute." });
        }

        var student = new Student
        {
            InstituteId = CurrentInstituteId,
            BranchId = targetBranchId,
            FullName = request.FullName.Trim(),
            Dob = request.Dob,
            Gender = request.Gender,
            ContactPhone = request.ContactPhone,
            ParentName = request.ParentName,
            ParentContact = request.ParentContact,
        };

        var sequence = await _db.Students.IgnoreQueryFilters()
            .Where(s => s.InstituteId == CurrentInstituteId)
            .CountAsync() + 1;
        student.StudentCode = $"STU-{CurrentInstituteId:D2}-{sequence:D5}";

        _db.Students.Add(student);
        await _db.SaveChangesAsync(); // need student.Id before generating the QR payload
        _kpiCache.Invalidate(CurrentInstituteId);

        student.QrPayload = _qrCodeService.CreateStudentQrPayload(student.Id, CurrentInstituteId);

        if (hasLoginEmail)
        {
            var loginUser = new User
            {
                InstituteId = CurrentInstituteId,
                BranchId = targetBranchId,
                Role = Role.Student,
                FullName = student.FullName,
                Email = request.LoginEmail!.Trim(),
                Status = UserStatus.Active,
            };
            loginUser.PasswordHash = _passwordHasher.HashPassword(loginUser, request.LoginPassword!);
            _db.Users.Add(loginUser);
            await _db.SaveChangesAsync();

            student.LinkedUserId = loginUser.Id;
        }

        if (request.ClassIds is { Count: > 0 })
        {
            var validClassIds = await _db.Classes
                .Where(c => request.ClassIds.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync();

            foreach (var classId in validClassIds)
            {
                _db.Enrollments.Add(new Enrollment
                {
                    InstituteId = CurrentInstituteId,
                    StudentId = student.Id,
                    ClassId = classId,
                });
            }
        }

        await _db.SaveChangesAsync();

        var saved = await _db.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .Include(s => s.Documents)
            .Include(s => s.LinkedUser)
            .FirstAsync(s => s.Id == student.Id);

        return CreatedAtAction(nameof(GetById), new { id = student.Id }, ToDetail(saved));
    }

    [HttpPost("{id:int}/credentials")]
    public async Task<ActionResult<StudentDetailResponse>> SetCredentials(int id, [FromBody] SetStudentCredentialsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LoginEmail) || string.IsNullOrWhiteSpace(request.LoginPassword))
        {
            return BadRequest(new { message = "Login email and password are required." });
        }
        if (request.LoginPassword.Length < 8)
        {
            return BadRequest(new { message = "Login password must be at least 8 characters." });
        }

        var student = await _db.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .Include(s => s.Documents)
            .Include(s => s.LinkedUser)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (student is null || !CanAccess(student)) return NotFound();

        var emailTaken = await _db.Users.IgnoreQueryFilters()
            .AnyAsync(u => u.Email == request.LoginEmail && u.Id != student.LinkedUserId);
        if (emailTaken)
        {
            return Conflict(new { message = "A user with this login email already exists." });
        }

        if (student.LinkedUser is null)
        {
            var loginUser = new User
            {
                InstituteId = CurrentInstituteId,
                BranchId = student.BranchId,
                Role = Role.Student,
                FullName = student.FullName,
                Email = request.LoginEmail.Trim(),
                Status = UserStatus.Active,
            };
            loginUser.PasswordHash = _passwordHasher.HashPassword(loginUser, request.LoginPassword);
            _db.Users.Add(loginUser);
            await _db.SaveChangesAsync();
            student.LinkedUserId = loginUser.Id;
        }
        else
        {
            student.LinkedUser.Email = request.LoginEmail.Trim();
            student.LinkedUser.PasswordHash = _passwordHasher.HashPassword(student.LinkedUser, request.LoginPassword);
            student.LinkedUser.FailedLoginCount = 0;
            student.LinkedUser.LockoutUntil = null;
        }

        await _db.SaveChangesAsync();

        var saved = await _db.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .Include(s => s.Documents)
            .Include(s => s.LinkedUser)
            .FirstAsync(s => s.Id == student.Id);
        return Ok(ToDetail(saved));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StudentDetailResponse>> Update(int id, [FromBody] UpdateStudentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { message = "Full name is required." });
        }

        var student = await _db.Students
            .Include(s => s.Enrollments).ThenInclude(e => e.Class)
            .Include(s => s.Documents)
            .Include(s => s.LinkedUser)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (student is null || !CanAccess(student)) return NotFound();

        student.FullName = request.FullName.Trim();
        student.Dob = request.Dob;
        student.Gender = request.Gender;
        student.ContactPhone = request.ContactPhone;
        student.ParentName = request.ParentName;
        student.ParentContact = request.ParentContact;

        await _db.SaveChangesAsync();
        return Ok(ToDetail(student));
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();
        student.Status = StudentStatus.Inactive; // soft delete — row is never removed
        await _db.SaveChangesAsync();
        _kpiCache.Invalidate(student.InstituteId);
        return NoContent();
    }

    [HttpPost("{id:int}/reactivate")]
    public async Task<IActionResult> Reactivate(int id)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();
        student.Status = StudentStatus.Active;
        await _db.SaveChangesAsync();
        _kpiCache.Invalidate(student.InstituteId);
        return NoContent();
    }

    [HttpPost("{id:int}/enrollments")]
    public async Task<IActionResult> Enroll(int id, [FromBody] int classId)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound(new { message = "Student not found." });

        var klass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
        if (klass is null) return NotFound(new { message = "Class not found." });
        if (IsBranchScoped && klass.BranchId != CurrentBranchId) return Forbid();

        var alreadyEnrolled = await _db.Enrollments.AnyAsync(e => e.StudentId == id && e.ClassId == classId);
        if (alreadyEnrolled) return Conflict(new { message = "Student is already enrolled in this class." });

        _db.Enrollments.Add(new Enrollment { InstituteId = CurrentInstituteId, StudentId = id, ClassId = classId });
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}/enrollments/{classId:int}")]
    public async Task<IActionResult> Unenroll(int id, int classId)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();

        var enrollment = await _db.Enrollments.FirstOrDefaultAsync(e => e.StudentId == id && e.ClassId == classId);
        if (enrollment is null) return NotFound();
        _db.Enrollments.Remove(enrollment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/documents")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<ActionResult<StudentDocumentResponse>> UploadDocument(int id, [FromForm] DocumentType docType, IFormFile file)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }
        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { message = "File exceeds the 5 MB limit." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedDocExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only JPG, PNG, and PDF files are allowed." });
        }

        var studentDir = Path.Combine(UploadsRoot, "students", student.Id.ToString());
        Directory.CreateDirectory(studentDir);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(studentDir, storedFileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var document = new StudentDocument
        {
            InstituteId = CurrentInstituteId,
            StudentId = student.Id,
            DocType = docType,
            FileUrl = Path.Combine("students", student.Id.ToString(), storedFileName).Replace('\\', '/'),
            OriginalFileName = file.FileName,
            FileSizeKb = (int)(file.Length / 1024),
        };
        _db.StudentDocuments.Add(document);
        await _db.SaveChangesAsync();

        return Ok(new StudentDocumentResponse(document.Id, document.DocType.ToString(), document.OriginalFileName, document.FileSizeKb, document.UploadedAt));
    }

    [HttpGet("{id:int}/documents/{docId:int}/file")]
    public async Task<IActionResult> DownloadDocument(int id, int docId)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();

        var document = await _db.StudentDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.StudentId == id);
        if (document is null) return NotFound();

        var fullPath = Path.Combine(UploadsRoot, document.FileUrl);
        if (!System.IO.File.Exists(fullPath)) return NotFound();

        return PhysicalFile(fullPath, "application/octet-stream", document.OriginalFileName);
    }

    [HttpGet("{id:int}/parent-links")]
    public async Task<ActionResult<List<ParentLinkResponse>>> ParentLinks(int id)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();

        var links = await _db.ParentLinks.Include(p => p.ParentUser)
            .Where(p => p.StudentId == id)
            .Select(p => new ParentLinkResponse(p.Id, p.ParentUserId, p.ParentUser!.FullName, p.ParentUser.Email))
            .ToListAsync();
        return Ok(links);
    }

    [HttpPost("{id:int}/parent-links")]
    public async Task<ActionResult<ParentLinkResponse>> AddParentLink(int id, [FromBody] CreateParentLinkRequest request)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();

        var parent = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.ParentUserId && u.Role == Role.Parent);
        if (parent is null) return BadRequest(new { message = "Parent account not found." });

        var alreadyLinked = await _db.ParentLinks.AnyAsync(p => p.StudentId == id && p.ParentUserId == request.ParentUserId);
        if (alreadyLinked) return Conflict(new { message = "This parent is already linked to this student." });

        var link = new ParentLink { InstituteId = CurrentInstituteId, StudentId = id, ParentUserId = request.ParentUserId };
        _db.ParentLinks.Add(link);
        await _db.SaveChangesAsync();

        return Ok(new ParentLinkResponse(link.Id, parent.Id, parent.FullName, parent.Email));
    }

    [HttpDelete("{id:int}/parent-links/{linkId:int}")]
    public async Task<IActionResult> RemoveParentLink(int id, int linkId)
    {
        var student = await _db.Students.FindAsync(id);
        if (student is null || !CanAccess(student)) return NotFound();

        var link = await _db.ParentLinks.FirstOrDefaultAsync(p => p.Id == linkId && p.StudentId == id);
        if (link is null) return NotFound();

        _db.ParentLinks.Remove(link);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("bulk-import")]
    public async Task<ActionResult<BulkImportResponse>> BulkImport(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "No CSV file was uploaded." });
        }

        var rows = new List<BulkImportRowResult>();
        var branchCache = await _db.Branches.ToDictionaryAsync(b => b.Id);
        var rowNumber = 1;
        var successCount = 0;

        using var reader = new StreamReader(file.OpenReadStream());
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        await csv.ReadAsync();
        csv.ReadHeader();

        while (await csv.ReadAsync())
        {
            rowNumber++;
            try
            {
                var fullName = csv.GetField("FullName")?.Trim();
                var dobRaw = csv.GetField("Dob");
                var branchIdRaw = csv.GetField("BranchId");

                if (string.IsNullOrWhiteSpace(fullName))
                {
                    rows.Add(new BulkImportRowResult(rowNumber, false, "FullName is required.", null));
                    continue;
                }
                if (!DateOnly.TryParse(dobRaw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dob))
                {
                    rows.Add(new BulkImportRowResult(rowNumber, false, $"Invalid Dob '{dobRaw}'. Expected YYYY-MM-DD.", null));
                    continue;
                }
                if (!int.TryParse(branchIdRaw, out var branchId) || !branchCache.ContainsKey(branchId))
                {
                    rows.Add(new BulkImportRowResult(rowNumber, false, $"Unknown BranchId '{branchIdRaw}'.", null));
                    continue;
                }
                if (IsBranchScoped && branchId != CurrentBranchId)
                {
                    rows.Add(new BulkImportRowResult(rowNumber, false, "BranchId does not match your assigned branch.", null));
                    continue;
                }

                var student = new Student
                {
                    InstituteId = CurrentInstituteId,
                    BranchId = branchId,
                    FullName = fullName,
                    Dob = dob,
                    Gender = csv.GetField("Gender"),
                    ContactPhone = csv.GetField("ContactPhone"),
                    ParentName = csv.GetField("ParentName"),
                    ParentContact = csv.GetField("ParentContact"),
                };

                var sequence = await _db.Students.IgnoreQueryFilters()
                    .Where(s => s.InstituteId == CurrentInstituteId)
                    .CountAsync() + 1;
                student.StudentCode = $"STU-{CurrentInstituteId:D2}-{sequence:D5}";

                _db.Students.Add(student);
                await _db.SaveChangesAsync();
                student.QrPayload = _qrCodeService.CreateStudentQrPayload(student.Id, CurrentInstituteId);
                await _db.SaveChangesAsync();
                _kpiCache.Invalidate(CurrentInstituteId);

                successCount++;
                rows.Add(new BulkImportRowResult(rowNumber, true, null, student.StudentCode));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bulk import failed on row {RowNumber}.", rowNumber);
                rows.Add(new BulkImportRowResult(rowNumber, false, "Unexpected error processing this row.", null));
            }
        }

        return Ok(new BulkImportResponse(rowNumber - 1, successCount, rows));
    }

    private bool CanAccess(Student student) => !IsBranchScoped || student.BranchId == CurrentBranchId;

    private static StudentDetailResponse ToDetail(Student s) => new(
        s.Id,
        s.StudentCode,
        s.QrPayload,
        s.FullName,
        s.Dob,
        s.Gender,
        s.ContactPhone,
        s.ParentName,
        s.ParentContact,
        s.BranchId,
        s.Status.ToString(),
        s.LinkedUser?.Email,
        s.Enrollments.Where(e => e.Class is not null).Select(e => new ClassSummaryResponse(
            e.Class!.Id, e.Class.Subject, e.Class.BranchId, e.Class.TeacherUserId, e.Class.Enrollments.Count)).ToList(),
        s.Documents.Select(d => new StudentDocumentResponse(d.Id, d.DocType.ToString(), d.OriginalFileName, d.FileSizeKb, d.UploadedAt)).ToList());
}
