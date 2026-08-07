using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Picks up Queued Email rows and attempts delivery. A failed attempt increments AttemptCount and
/// is left Queued for the next pass (the retry); a second failure marks it Failed permanently —
/// per Phase 6, retried at most once, never retried forever. Runs as a background loop rather than
/// inline in the request pipeline, so an SMTP outage can never delay or roll back the core action
/// (attendance/fee write) that originally queued the notification.
/// </summary>
public class NotificationDeliveryBackgroundService : BackgroundService
{
    private const int MaxAttempts = 2;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(20);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationDeliveryBackgroundService> _logger;

    public NotificationDeliveryBackgroundService(IServiceScopeFactory scopeFactory, ILogger<NotificationDeliveryBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DeliverPendingEmails(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Notification delivery cycle failed.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task DeliverPendingEmails(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var pending = await db.NotificationQueueItems.IgnoreQueryFilters()
            .Where(n => n.Channel == NotificationChannel.Email
                && n.Status == NotificationStatus.Queued
                && n.AttemptCount < MaxAttempts
                && n.RecipientEmail != null)
            .ToListAsync(stoppingToken);

        foreach (var item in pending)
        {
            item.AttemptCount++;
            item.LastAttemptAt = DateTime.UtcNow;

            try
            {
                await emailSender.SendAsync(item.RecipientEmail!, item.Subject, item.Message, stoppingToken);
                item.Status = NotificationStatus.Sent;
                item.SentAt = DateTime.UtcNow;
                item.FailureReason = null;
            }
            catch (Exception ex)
            {
                item.FailureReason = ex.Message;
                item.Status = item.AttemptCount >= MaxAttempts ? NotificationStatus.Failed : NotificationStatus.Queued;
            }
        }

        if (pending.Count > 0)
        {
            await db.SaveChangesAsync(stoppingToken);
        }
    }
}
