using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Every "trigger a notification" moment in Phases 3/4/8 calls Enqueue instead of touching the
/// DbSet directly. One logical event produces two outbox rows: an InSystem row (marked Sent
/// immediately — the DB write itself is the delivery) and an Email row (picked up later by
/// NotificationDeliveryBackgroundService). Callers must still SaveChangesAsync — this only adds
/// to the change tracker, so the notification commits in the same transaction as the core action
/// that triggered it, without making that action wait on an SMTP round trip.
/// </summary>
public class NotificationQueueService
{
    private readonly AppDbContext _db;
    private readonly NotificationTemplateService _templates;

    public NotificationQueueService(AppDbContext db, NotificationTemplateService templates)
    {
        _db = db;
        _templates = templates;
    }

    public async Task Enqueue(
        int instituteId, NotificationEventType eventType, int recipientUserId, IReadOnlyDictionary<string, string> placeholders)
    {
        var recipient = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == recipientUserId);
        if (recipient is null) return;

        var (subject, body) = await _templates.Render(instituteId, eventType, placeholders);

        _db.NotificationQueueItems.Add(new NotificationQueueItem
        {
            InstituteId = instituteId,
            EventType = eventType,
            Channel = NotificationChannel.InSystem,
            RecipientUserId = recipientUserId,
            Subject = subject,
            Message = body,
            Status = NotificationStatus.Sent,
            SentAt = DateTime.UtcNow,
        });

        _db.NotificationQueueItems.Add(new NotificationQueueItem
        {
            InstituteId = instituteId,
            EventType = eventType,
            Channel = NotificationChannel.Email,
            RecipientUserId = recipientUserId,
            RecipientEmail = recipient.Email,
            Subject = subject,
            Message = body,
            Status = NotificationStatus.Queued,
        });
    }
}
