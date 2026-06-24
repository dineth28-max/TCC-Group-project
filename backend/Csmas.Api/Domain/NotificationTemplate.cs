namespace Csmas.Api.Domain;

/// <summary>
/// Admin-editable override of the built-in default wording for an event type. Absence of a row
/// for a given (InstituteId, EventType) means "use the hardcoded default" — see
/// NotificationTemplateService.
/// </summary>
public class NotificationTemplate
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public NotificationEventType EventType { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
