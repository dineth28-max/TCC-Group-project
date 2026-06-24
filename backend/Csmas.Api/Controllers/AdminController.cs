using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Csmas.Api.Services;

namespace Csmas.Api.Controllers;

/// <summary>
/// Full F5 KPI set (plan.md §5.1/§5.2): total students, attendance rate, fee collection rate, and
/// an AI risk-flag count placeholder (always 0 with RiskEngineEnabled=false until Phase 8 wires
/// the AI service in). Cached 5 minutes per institute+branch scope, as called for in plan.md §6 (F5).
/// The cache key is versioned via KpiCacheService so mutations (e.g. student activate/deactivate)
/// can invalidate it immediately instead of waiting out the TTL.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class AdminController : TenantScopedController
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly KpiCacheService _kpiCache;

    public AdminController(AppDbContext db, IMemoryCache cache, KpiCacheService kpiCache)
    {
        _db = db;
        _cache = cache;
        _kpiCache = kpiCache;
    }

    [HttpGet("kpis")]
    public async Task<ActionResult<KpisResponse>> Kpis()
    {
        var cacheKey = _kpiCache.CacheKey(CurrentInstituteId, CurrentBranchId);
        if (_cache.TryGetValue(cacheKey, out KpisResponse? cached) && cached is not null)
        {
            return Ok(cached);
        }

        var studentsQuery = _db.Students.Where(s => s.Status == StudentStatus.Active);
        if (IsBranchScoped) studentsQuery = studentsQuery.Where(s => s.BranchId == CurrentBranchId);
        var totalStudents = await studentsQuery.CountAsync();

        var attendanceRate = await ComputeAttendanceRate(DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-30), DateOnly.FromDateTime(DateTime.UtcNow));
        var feeRate = await ComputeFeeCollectionRate();
        var trend = await ComputeAttendanceTrend(14);

        var response = new KpisResponse(totalStudents, attendanceRate, feeRate, 0, false, trend);
        _cache.Set(cacheKey, response, CacheTtl);
        return Ok(response);
    }

    private async Task<decimal> ComputeAttendanceRate(DateOnly from, DateOnly to)
    {
        var sessionsQuery = _db.Sessions.Where(s => s.Status == SessionStatus.Closed && s.SessionDate >= from && s.SessionDate <= to);
        if (IsBranchScoped) sessionsQuery = sessionsQuery.Where(s => s.BranchId == CurrentBranchId);
        var sessionIds = await sessionsQuery.Select(s => s.Id).ToListAsync();
        if (sessionIds.Count == 0) return 0;

        var total = await _db.Attendances.CountAsync(a => sessionIds.Contains(a.SessionId));
        if (total == 0) return 0;
        var presentOrLate = await _db.Attendances.CountAsync(a => sessionIds.Contains(a.SessionId) && a.Status != AttendanceStatus.Absent);
        return Math.Round(100m * presentOrLate / total, 1);
    }

    private async Task<decimal> ComputeFeeCollectionRate()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var period = $"{today.Year:D4}-{today.Month:D2}";
        var invoicesQuery = _db.Invoices.Where(i => i.BillingPeriod == period);
        if (IsBranchScoped) invoicesQuery = invoicesQuery.Where(i => i.Student!.BranchId == CurrentBranchId);

        var invoices = await invoicesQuery.ToListAsync();
        var totalInvoiced = invoices.Sum(i => i.TotalDue);
        var totalCollected = invoices.Sum(i => i.AmountPaid);
        return totalInvoiced == 0 ? 0 : Math.Round(100m * totalCollected / totalInvoiced, 1);
    }

    private async Task<List<AttendanceTrendPoint>> ComputeAttendanceTrend(int days)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = today.AddDays(-(days - 1));

        var sessionsQuery = _db.Sessions.Where(s => s.Status == SessionStatus.Closed && s.SessionDate >= from && s.SessionDate <= today);
        if (IsBranchScoped) sessionsQuery = sessionsQuery.Where(s => s.BranchId == CurrentBranchId);
        var sessions = await sessionsQuery.Select(s => new { s.Id, s.SessionDate }).ToListAsync();
        var sessionIds = sessions.Select(s => s.Id).ToList();

        var attendances = sessionIds.Count == 0
            ? new List<Attendance>()
            : await _db.Attendances.Where(a => sessionIds.Contains(a.SessionId)).ToListAsync();

        var byDate = sessions.GroupBy(s => s.SessionDate).ToDictionary(g => g.Key, g => g.Select(s => s.Id).ToHashSet());

        var points = new List<AttendanceTrendPoint>();
        for (var date = from; date <= today; date = date.AddDays(1))
        {
            if (!byDate.TryGetValue(date, out var idsForDate) || idsForDate.Count == 0)
            {
                points.Add(new AttendanceTrendPoint(date.ToString("yyyy-MM-dd"), 0));
                continue;
            }
            var dayAttendances = attendances.Where(a => idsForDate.Contains(a.SessionId)).ToList();
            var rate = dayAttendances.Count == 0 ? 0 :
                Math.Round(100m * dayAttendances.Count(a => a.Status != AttendanceStatus.Absent) / dayAttendances.Count, 1);
            points.Add(new AttendanceTrendPoint(date.ToString("yyyy-MM-dd"), rate));
        }

        return points;
    }
}
