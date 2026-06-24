using Microsoft.Extensions.Caching.Memory;

namespace Csmas.Api.Services;

/// <summary>
/// Versioned KPI cache key so dashboard KPIs (5-minute TTL, see AdminController) can be
/// invalidated immediately whenever underlying data changes (e.g. a student is
/// activated/deactivated), instead of waiting out the TTL.
/// </summary>
public class KpiCacheService
{
    private readonly IMemoryCache _cache;

    public KpiCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public string CacheKey(int instituteId, int? branchId)
    {
        var version = _cache.Get<int>(VersionKey(instituteId));
        return $"kpis:{instituteId}:{branchId}:{version}";
    }

    public void Invalidate(int instituteId)
    {
        var key = VersionKey(instituteId);
        var version = _cache.Get<int>(key);
        _cache.Set(key, version + 1);
    }

    private static string VersionKey(int instituteId) => $"kpisVersion:{instituteId}";
}
