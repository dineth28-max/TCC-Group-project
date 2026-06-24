namespace Csmas.Api.Data;

public class HttpContextTenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _accessor;

    public HttpContextTenantProvider(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public int? InstituteId
    {
        get
        {
            var claim = _accessor.HttpContext?.User?.FindFirst("instituteId");
            return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }

    // No HTTP request (migrations, seeding, background jobs) -> filter does not apply.
    // Any authenticated HTTP request -> filter always applies, scoped to that user's institute.
    public bool BypassTenantFilter =>
        _accessor.HttpContext is null || _accessor.HttpContext.User?.Identity?.IsAuthenticated != true;
}
