using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Phase 15: per-teacher earnings from online payments, the institute's commission income, the
/// underlying transaction ledger, and teacher payout bank details. SystemAdmin sees every branch;
/// BranchAdmin is scoped to teachers in their own branch, same as the rest of the admin surface.
/// </summary>
[ApiController]
[Route("api/teacher-revenue")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class TeacherRevenueController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly AuditLogService _auditLog;

    public TeacherRevenueController(AppDbContext db, SecretEncryptionService encryption, AuditLogService auditLog)
    {
        _db = db;
        _encryption = encryption;
        _auditLog = auditLog;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<TeacherRevenueOverviewResponse>> Summary()
    {
        var query = _db.TeacherEarnings.Include(e => e.TeacherUser).AsQueryable();
        if (IsBranchScoped) query = query.Where(e => e.TeacherUser!.BranchId == CurrentBranchId);

        var earnings = await query.ToListAsync();
        var teachers = earnings
            .GroupBy(e => new { e.TeacherUserId, Name = e.TeacherUser?.FullName ?? "" })
            .Select(g => new TeacherRevenueSummaryRow(g.Key.TeacherUserId, g.Key.Name, g.Sum(e => e.NetAmount), g.Sum(e => e.CommissionAmount), g.Count()))
            .OrderByDescending(r => r.TotalNetEarned)
            .ToList();

        return Ok(new TeacherRevenueOverviewResponse(teachers, earnings.Sum(e => e.CommissionAmount)));
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<List<TeacherEarningRow>>> Transactions(
        [FromQuery] int? teacherId, [FromQuery] string? payoutStatus, [FromQuery] string? dateFrom, [FromQuery] string? dateTo)
    {
        var query = _db.TeacherEarnings.Include(e => e.TeacherUser).AsQueryable();
        if (IsBranchScoped) query = query.Where(e => e.TeacherUser!.BranchId == CurrentBranchId);
        if (teacherId.HasValue) query = query.Where(e => e.TeacherUserId == teacherId);
        if (!string.IsNullOrWhiteSpace(payoutStatus)) query = query.Where(e => e.PayoutStatus == payoutStatus);
        if (DateOnly.TryParse(dateFrom, out var from)) query = query.Where(e => e.CreatedAt >= from.ToDateTime(TimeOnly.MinValue));
        if (DateOnly.TryParse(dateTo, out var to)) query = query.Where(e => e.CreatedAt < to.ToDateTime(TimeOnly.MinValue).AddDays(1));

        var rows = await query.OrderByDescending(e => e.CreatedAt).Take(200).ToListAsync();
        return Ok(rows.Select(e => new TeacherEarningRow(
            e.Id, e.TeacherUserId, e.TeacherUser?.FullName ?? "", e.PaymentTransactionId,
            e.GrossAmount, e.CommissionPercent, e.CommissionAmount, e.NetAmount, e.PayoutStatus, e.CreatedAt)).ToList());
    }

    [HttpPost("transactions/{id:int}/mark-paid")]
    public async Task<IActionResult> MarkPaid(int id)
    {
        var earning = await _db.TeacherEarnings.Include(e => e.TeacherUser).FirstOrDefaultAsync(e => e.Id == id);
        if (earning is null) return NotFound();
        if (IsBranchScoped && earning.TeacherUser?.BranchId != CurrentBranchId) return NotFound();

        earning.PayoutStatus = "Paid";
        await _db.SaveChangesAsync();
        await _auditLog.Record(CurrentInstituteId, CurrentUserId, "TeacherEarning.MarkedPaid", earning.TeacherUser?.FullName);
        return NoContent();
    }

    [HttpGet("bank-details/{teacherId:int}")]
    public async Task<ActionResult<TeacherBankDetailResponse>> GetBankDetails(int teacherId)
    {
        var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == teacherId && u.Role == Role.Teacher);
        if (teacher is null) return NotFound();
        if (IsBranchScoped && teacher.BranchId != CurrentBranchId) return NotFound();

        var detail = await _db.TeacherBankDetails.FirstOrDefaultAsync(d => d.TeacherUserId == teacherId);
        if (detail is null) return Ok(new TeacherBankDetailResponse(teacherId, null, null, null, false));

        var accountNumber = _encryption.Decrypt(detail.AccountNumberEncrypted);
        return Ok(new TeacherBankDetailResponse(teacherId, detail.AccountHolderName, detail.BankName, Mask(accountNumber), true));
    }

    [HttpPut("bank-details/{teacherId:int}")]
    public async Task<ActionResult<TeacherBankDetailResponse>> SaveBankDetails(int teacherId, [FromBody] SaveTeacherBankDetailRequest request)
    {
        var teacher = await _db.Users.FirstOrDefaultAsync(u => u.Id == teacherId && u.Role == Role.Teacher);
        if (teacher is null) return NotFound();
        if (IsBranchScoped && teacher.BranchId != CurrentBranchId) return NotFound();
        if (string.IsNullOrWhiteSpace(request.AccountHolderName) || string.IsNullOrWhiteSpace(request.BankName) || string.IsNullOrWhiteSpace(request.AccountNumber))
        {
            return BadRequest(new { message = "Account holder name, bank name, and account number are all required." });
        }

        var detail = await _db.TeacherBankDetails.FirstOrDefaultAsync(d => d.TeacherUserId == teacherId);
        if (detail is null)
        {
            detail = new TeacherBankDetail { InstituteId = teacher.InstituteId, TeacherUserId = teacherId };
            _db.TeacherBankDetails.Add(detail);
        }

        detail.AccountHolderName = request.AccountHolderName.Trim();
        detail.BankName = request.BankName.Trim();
        detail.AccountNumberEncrypted = _encryption.Encrypt(request.AccountNumber.Trim());
        detail.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _auditLog.Record(CurrentInstituteId, CurrentUserId, "TeacherBankDetail.Updated", teacher.FullName);

        return Ok(new TeacherBankDetailResponse(teacherId, detail.AccountHolderName, detail.BankName, Mask(request.AccountNumber.Trim()), true));
    }

    private static string Mask(string value) =>
        value.Length <= 4 ? value : new string('*', value.Length - 4) + value[^4..];
}
