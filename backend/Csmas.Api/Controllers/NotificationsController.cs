using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>Admin-facing half of the Notification Engine: editable templates and the delivery log.</summary>
[ApiController]
[Route("api/notifications")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class NotificationsController : TenantScopedController
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("templates")]
    public async Task<ActionResult<List<NotificationTemplateResponse>>> ListTemplates()
    {
        var overrides = await _db.NotificationTemplates
            .ToDictionaryAsync(t => t.EventType);

        var result = Enum.GetValues<NotificationEventType>().Select(eventType =>
        {
            if (overrides.TryGetValue(eventType, out var t))
            {
                return new NotificationTemplateResponse(eventType.ToString(), t.Subject, t.Body, true);
            }
            var (subject, body) = NotificationTemplateService.Default(eventType);
            return new NotificationTemplateResponse(eventType.ToString(), subject, body, false);
        }).ToList();

        return Ok(result);
    }

    [HttpPut("templates/{eventType}")]
    public async Task<ActionResult<NotificationTemplateResponse>> UpdateTemplate(string eventType, [FromBody] UpdateNotificationTemplateRequest request)
    {
        if (!Enum.TryParse<NotificationEventType>(eventType, true, out var parsedType))
        {
            return BadRequest(new { message = "Unknown event type." });
        }
        if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Body))
        {
            return BadRequest(new { message = "Subject and body are required." });
        }

        var template = await _db.NotificationTemplates.FirstOrDefaultAsync(t => t.EventType == parsedType);
        if (template is null)
        {
            template = new NotificationTemplate { InstituteId = CurrentInstituteId, EventType = parsedType };
            _db.NotificationTemplates.Add(template);
        }

        template.Subject = request.Subject.Trim();
        template.Body = request.Body.Trim();
        template.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new NotificationTemplateResponse(parsedType.ToString(), template.Subject, template.Body, true));
    }

    [HttpGet("delivery-log")]
    public async Task<ActionResult<List<DeliveryLogRow>>> DeliveryLog([FromQuery] string? status, [FromQuery] string? channel)
    {
        var query = _db.NotificationQueueItems.Include(n => n.RecipientUser).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<NotificationStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(n => n.Status == parsedStatus);
        }
        if (!string.IsNullOrWhiteSpace(channel) && Enum.TryParse<NotificationChannel>(channel, true, out var parsedChannel))
        {
            query = query.Where(n => n.Channel == parsedChannel);
        }

        var rows = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(200)
            .Select(n => new DeliveryLogRow(
                n.Id,
                n.EventType.ToString(),
                n.Channel.ToString(),
                n.RecipientUser != null ? n.RecipientUser.FullName : "Unknown",
                n.RecipientEmail,
                n.Subject,
                n.Status.ToString(),
                n.AttemptCount,
                n.FailureReason,
                n.CreatedAt,
                n.SentAt))
            .ToListAsync();

        return Ok(rows);
    }
}
