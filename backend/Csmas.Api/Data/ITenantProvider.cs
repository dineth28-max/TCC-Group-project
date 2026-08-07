namespace Csmas.Api.Data;

/// <summary>
/// Resolves the current request's institute scope from the authenticated user's JWT claims.
/// Every tenant-scoped EF Core query filter reads from this — see AppDbContext.OnModelCreating.
/// </summary>
public interface ITenantProvider
{
    int? InstituteId { get; }
    bool BypassTenantFilter { get; }
}
