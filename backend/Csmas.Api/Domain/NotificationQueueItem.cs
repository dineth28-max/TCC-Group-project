namespace Csmas.Api.Domain;

/// <summary>
/// Doubles as the outbox queue and the delivery log: one row per (event, channel) attempt.
/// A single triggered event (e.g. AttendanceAbsent) produces one Email row and one InSystem row.
/// InSystem rows are marked Sent immediately (the DB write itself is the delivery); Email rows are
/// picked up by NotificationDeliveryBackgroundService, which retries once before marking Failed —
/// per Phase 6, that retry/failure path never blocks or rolls back the core action that triggered it.
/// </summary>
public class NotificationQueueItem
{
    public int Id { get; set; }
    public int InstituteId { get; set; }
    public NotificationEventType EventType { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.InSystem;
    public int RecipientUserId { get; set; }
    public User? RecipientUser { get; set; }
    public string? RecipientEmail { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationStatus Status { get; set; } = NotificationStatus.Queued;
    public int AttemptCount { get; set; }
    public DateTime? LastAttemptAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? FailureReason { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
