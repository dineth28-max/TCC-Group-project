using Microsoft.AspNetCore.Mvc;

namespace Csmas.Api.Controllers;

/// <summary>
/// Shared identity helpers for controllers. Institute isolation is already enforced by the
/// global EF Core query filter (AppDbContext); this adds the branch-level half of the Phase 1
/// isolation rule, which a BranchAdmin/Teacher needs but a SystemAdmin (no branch claim) does not.
/// </summary>
[ApiController]
public abstract class TenantScopedController : ControllerBase
{
    protected int CurrentInstituteId => int.Parse(User.FindFirst("instituteId")!.Value);

    protected int CurrentUserId => int.Parse(User.FindFirst("sub")!.Value);

    /// <summary>Null for SystemAdmin (institute-wide) and any role without a branch assignment.</summary>
    protected int? CurrentBranchId
    {
        get
        {
            var claim = User.FindFirst("branchId");
            return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }

    protected bool IsBranchScoped => CurrentBranchId.HasValue && !User.IsInRole("SystemAdmin");
}
