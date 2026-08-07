using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Renders the subject/body for a notification event, preferring an admin-configured
/// NotificationTemplate override for the institute and falling back to a sane built-in default
/// when none exists. Placeholders are simple {Key} tokens substituted from the supplied dictionary.
/// </summary>
public class NotificationTemplateService
{
    private static readonly Dictionary<NotificationEventType, (string Subject, string Body)> Defaults = new()
    {
        [NotificationEventType.AttendanceAbsent] = (
            "{StudentName} was marked absent",
            "{StudentName} was marked absent from {Subject} on {Date}. Current attendance rate: {AttendanceRate}%."),
        [NotificationEventType.FeeReminderT7] = (
            "Fee due in 7 days for {StudentName}",
            "The {BillingPeriod} invoice for {StudentName} ({Subject}) of {TotalDue} is due on {DueDate}."),
        [NotificationEventType.FeeReminderT1] = (
            "Fee due tomorrow for {StudentName}",
            "Reminder: the {BillingPeriod} invoice for {StudentName} ({Subject}) of {TotalDue} is due tomorrow ({DueDate})."),
        [NotificationEventType.FeeOverdue] = (
            "Overdue fee for {StudentName}",
            "The {BillingPeriod} invoice for {StudentName} ({Subject}) of {TotalDue} is now overdue (was due {DueDate})."),
        [NotificationEventType.RiskEscalation] = (
            "{StudentName} flagged as High risk",
            "{StudentName}'s risk level moved from Medium to High. Please review their attendance history."),
    };

    private readonly AppDbContext _db;

    public NotificationTemplateService(AppDbContext db)
    {
        _db = db;
    }

    public static (string Subject, string Body) Default(NotificationEventType eventType) => Defaults[eventType];

    public async Task<(string Subject, string Body)> Render(
        int instituteId, NotificationEventType eventType, IReadOnlyDictionary<string, string> placeholders)
    {
        var template = await _db.NotificationTemplates.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.InstituteId == instituteId && t.EventType == eventType);

        var (subject, body) = template is not null ? (template.Subject, template.Body) : Defaults[eventType];

        foreach (var (key, value) in placeholders)
        {
            subject = subject.Replace($"{{{key}}}", value);
            body = body.Replace($"{{{key}}}", value);
        }

        return (subject, body);
    }
}
