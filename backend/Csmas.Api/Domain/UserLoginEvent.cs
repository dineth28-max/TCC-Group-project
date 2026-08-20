namespace Csmas.Api.Domain;

/// <summary>
/// One row per successful login, across all roles. Exists so RiskFeatureBuilder can compute the
/// "parent portal login frequency" input (F7) — the only role that feature actually reads is Parent,
/// but logging every role uniformly keeps AuthController.Login simple.
/// </summary>
public class UserLoginEvent
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public int UserId { get; set; }
    public DateTime LoggedInAt { get; set; } = DateTime.UtcNow;
}
