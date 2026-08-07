using Csmas.Api.Data;
using Csmas.Api.Domain;

namespace Csmas.Api.Services;

/// <summary>
/// Records who changed a sensitive setting/credential and when (Phase 16). Deliberately a simple
/// insert-and-save, not folded into the caller's own SaveChangesAsync — an audit entry should still
/// land even if it's the only thing worth keeping from a request that otherwise fails downstream,
/// and the actions logged here (settings saves, password resets) are not hot-path/high-frequency.
/// </summary>
public class AuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task Record(int instituteId, int actorUserId, string action, string? targetDescription = null)
    {
        _db.AuditLogEntries.Add(new AuditLogEntry
        {
            InstituteId = instituteId,
            ActorUserId = actorUserId,
            Action = action,
            TargetDescription = targetDescription,
        });
        await _db.SaveChangesAsync();
    }
}
