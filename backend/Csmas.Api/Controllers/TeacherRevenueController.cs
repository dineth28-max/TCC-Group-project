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

    /// <summary>Per-teacher earnings for the Teacher Earnings page, filtered by earning date (inclusive).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<TeacherRevenueOverviewResponse>> Summary([FromQuery] string? from, [FromQuery] string? to)
    {
        var (fromAt, toAt) = ParseRange(from, to);
        if (fromAt >= toAt) return BadRequest(new { message = "The start date must be on or before the end date." });

        var query = _db.TeacherEarnings.AsQueryable();
        if (fromAt.HasValue) query = query.Where(e => e.CreatedAt >= fromAt);
        if (toAt.HasValue) query = query.Where(e => e.CreatedAt < toAt);
        if (IsBranchScoped) query = query.Where(e => e.TeacherUser!.BranchId == CurrentBranchId);

        var totals = await query
            .GroupBy(e => e.TeacherUserId)
            .Select(g => new
            {
                TeacherUserId = g.Key,
                Gross = g.Sum(e => e.GrossAmount),
                Net = g.Sum(e => e.NetAmount),
                Commission = g.Sum(e => e.CommissionAmount),
                Unpaid = g.Sum(e => e.PayoutStatus == "Paid" ? 0m : e.NetAmount),
                Count = g.Count(),
                LastEarnedAt = g.Max(e => e.CreatedAt),
            })
            .ToListAsync();

        var teacherIds = totals.Select(t => t.TeacherUserId).ToList();
        var teachers = await _db.Users
            .Include(u => u.Branch)
            .Where(u => teacherIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        var rows = totals
            .Select(t =>
            {
                teachers.TryGetValue(t.TeacherUserId, out var teacher);
                return new TeacherRevenueSummaryRow(
                    t.TeacherUserId, teacher?.FullName ?? "", teacher?.Branch?.Name,
                    t.Gross, t.Net, t.Commission, t.Unpaid, t.Count, t.LastEarnedAt);
            })
            .OrderByDescending(r => r.TotalNetEarned)
            .ToList();

        return Ok(new TeacherRevenueOverviewResponse(rows, rows.Sum(r => r.TotalCommission)));
    }

    /// <summary>Per-class revenue for the Class Revenue page, filtered by payment date (inclusive).</summary>
    [HttpGet("by-class")]
    public async Task<ActionResult<List<ClassRevenueRow>>> ByClass([FromQuery] string? from, [FromQuery] string? to)
    {
        var (fromAt, toAt) = ParseRange(from, to);
        if (fromAt >= toAt) return BadRequest(new { message = "The start date must be on or before the end date." });

        // Both halves are scoped by the class's branch so a row's collected total and its split
        // always describe the same set of payments.
        var payments = _db.Payments.AsQueryable();
        if (fromAt.HasValue) payments = payments.Where(p => p.PaidAt >= fromAt);
        if (toAt.HasValue) payments = payments.Where(p => p.PaidAt < toAt);
        if (IsBranchScoped) payments = payments.Where(p => p.Invoice!.Class!.BranchId == CurrentBranchId);
        var paymentTotals = await payments
            .GroupBy(p => p.Invoice!.ClassId)
            .Select(g => new
            {
                ClassId = g.Key,
                Total = g.Sum(p => p.Amount),
                Online = g.Sum(p => p.Method.StartsWith("Online") ? p.Amount : 0),
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.ClassId);

        var earnings = _db.TeacherEarnings.AsQueryable();
        if (fromAt.HasValue) earnings = earnings.Where(e => e.CreatedAt >= fromAt);
        if (toAt.HasValue) earnings = earnings.Where(e => e.CreatedAt < toAt);
        if (IsBranchScoped) earnings = earnings.Where(e => e.PaymentTransaction!.Invoice!.Class!.BranchId == CurrentBranchId);
        var earningTotals = await earnings
            .GroupBy(e => e.PaymentTransaction!.Invoice!.ClassId)
            .Select(g => new { ClassId = g.Key, Net = g.Sum(e => e.NetAmount), Commission = g.Sum(e => e.CommissionAmount) })
            .ToDictionaryAsync(x => x.ClassId);

        var classIds = paymentTotals.Keys.Union(earningTotals.Keys).ToList();
        var classes = await _db.Classes
            .Include(c => c.Branch)
            .Include(c => c.TeacherUser)
            .Where(c => classIds.Contains(c.Id))
            .ToListAsync();

        var rows = classes.Select(c =>
            {
                paymentTotals.TryGetValue(c.Id, out var paid);
                earningTotals.TryGetValue(c.Id, out var earned);
                return new ClassRevenueRow(
                    c.Id, c.Subject, c.BranchId, c.Branch?.Name ?? "", c.TeacherUserId, c.TeacherUser?.FullName,
                    paid?.Total ?? 0, paid?.Online ?? 0, earned?.Net ?? 0, earned?.Commission ?? 0, paid?.Count ?? 0);
            })
            .OrderByDescending(r => r.TotalCollected)
            .ToList();

        return Ok(rows);
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

    /// <summary>Turns an inclusive yyyy-MM-dd range into [from, to) bounds; a missing or unparseable end is left open.</summary>
    private static (DateTime? From, DateTime? To) ParseRange(string? from, string? to) => (
        DateOnly.TryParse(from, out var fromDate) ? fromDate.ToDateTime(TimeOnly.MinValue) : null,
        DateOnly.TryParse(to, out var toDate) ? toDate.ToDateTime(TimeOnly.MinValue).AddDays(1) : null);

    private static string Mask(string value) =>
        value.Length <= 4 ? value : new string('*', value.Length - 4) + value[^4..];
}
