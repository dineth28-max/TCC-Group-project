namespace Csmas.Api.Dtos;

public record NotificationTemplateResponse(string EventType, string Subject, string Body, bool IsCustomized);

public record UpdateNotificationTemplateRequest(string Subject, string Body);

public record DeliveryLogRow(
    int Id,
    string EventType,
    string Channel,
    string RecipientName,
    string? RecipientEmail,
    string Subject,
    string Status,
    int AttemptCount,
    string? FailureReason,
    DateTime CreatedAt,
    DateTime? SentAt);

public record NotificationInboxRow(int Id, string EventType, string Subject, string Message, bool IsRead, DateTime CreatedAt);

public record NotificationInboxResponse(int UnreadCount, List<NotificationInboxRow> Items);
