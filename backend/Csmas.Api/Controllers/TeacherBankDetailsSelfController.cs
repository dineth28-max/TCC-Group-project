using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Teacher self-service half of Phase 17's bank details: a Teacher can enter their own payout
/// account instead of requiring an Admin to do it on their behalf. Reads/writes the exact same
/// TeacherBankDetail row TeacherRevenueController's admin-facing endpoints use, keyed off the
/// caller's own id, so the Admin "Teacher Bank Details" page reflects it immediately.
/// </summary>
[ApiController]
[Route("api/teacher/bank-details")]
[Authorize(Roles = "Teacher")]
public class TeacherBankDetailsSelfController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly AuditLogService _auditLog;

    public TeacherBankDetailsSelfController(AppDbContext db, SecretEncryptionService encryption, AuditLogService auditLog)
    {
        _db = db;
        _encryption = encryption;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<ActionResult<TeacherBankDetailResponse>> Get()
    {
        var detail = await _db.TeacherBankDetails.FirstOrDefaultAsync(d => d.TeacherUserId == CurrentUserId);
        if (detail is null) return Ok(new TeacherBankDetailResponse(CurrentUserId, null, null, null, false));

        var accountNumber = _encryption.Decrypt(detail.AccountNumberEncrypted);
        return Ok(new TeacherBankDetailResponse(CurrentUserId, detail.AccountHolderName, detail.BankName, Mask(accountNumber), true));
    }

    [HttpPut]
    public async Task<ActionResult<TeacherBankDetailResponse>> Save([FromBody] SaveTeacherBankDetailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountHolderName) || string.IsNullOrWhiteSpace(request.BankName) || string.IsNullOrWhiteSpace(request.AccountNumber))
        {
            return BadRequest(new { message = "Account holder name, bank name, and account number are all required." });
        }

        var detail = await _db.TeacherBankDetails.FirstOrDefaultAsync(d => d.TeacherUserId == CurrentUserId);
        if (detail is null)
        {
            detail = new TeacherBankDetail { InstituteId = CurrentInstituteId, TeacherUserId = CurrentUserId };
            _db.TeacherBankDetails.Add(detail);
        }

        detail.AccountHolderName = request.AccountHolderName.Trim();
        detail.BankName = request.BankName.Trim();
        detail.AccountNumberEncrypted = _encryption.Encrypt(request.AccountNumber.Trim());
        detail.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _auditLog.Record(CurrentInstituteId, CurrentUserId, "TeacherBankDetail.SelfUpdated", null);

        return Ok(new TeacherBankDetailResponse(CurrentUserId, detail.AccountHolderName, detail.BankName, Mask(request.AccountNumber.Trim()), true));
    }

    private static string Mask(string value) =>
        value.Length <= 4 ? value : new string('*', value.Length - 4) + value[^4..];
}
