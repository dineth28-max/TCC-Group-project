using Csmas.Api.Data;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Auth;

/// <summary>
/// Phase 16: server-side enforcement of MustChangePassword. Without this, the flag was only
/// checked by the frontend's ProtectedRoute — a stolen or directly-scripted access token could
/// call any other endpoint indefinitely without ever changing an admin-set/generated password,
/// defeating the whole point of the feature. Runs as a global action filter so every controller
/// is covered without each one remembering to check it; /api/auth/* is exempt so login, refresh,
/// "who am I", and change-password itself still work while the flag is set. Anonymous endpoints
/// (the payment webhooks) are unaffected since this only fires for an authenticated principal.
/// </summary>
public class MustChangePasswordFilter : IAsyncActionFilter
{
    private readonly AppDbContext _db;

    public MustChangePasswordFilter(AppDbContext db)
    {
        _db = db;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated == true && !context.HttpContext.Request.Path.StartsWithSegments("/api/auth"))
        {
            var sub = user.FindFirst("sub")?.Value;
            if (sub is not null && int.TryParse(sub, out var userId))
            {
                var mustChangePassword = await _db.Users.IgnoreQueryFilters()
                    .Where(u => u.Id == userId)
                    .Select(u => u.MustChangePassword)
                    .FirstOrDefaultAsync();

                if (mustChangePassword)
                {
                    context.Result = new Microsoft.AspNetCore.Mvc.ObjectResult(
                        new { message = "You must set a new password before continuing. Call POST /api/auth/change-password." })
                    {
                        StatusCode = 403,
                    };
                    return;
                }
            }
        }

        await next();
    }
}
