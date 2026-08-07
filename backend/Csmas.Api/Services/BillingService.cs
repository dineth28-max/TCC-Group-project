using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Services;

/// <summary>
/// Core billing-cycle logic shared by the admin-triggered "run now" endpoint and the daily
/// background job — see plan.md §14.5. Always operates with tenant filters bypassed since it
/// must run across every institute.
/// </summary>
public class BillingService
{
    private readonly AppDbContext _db;
    private readonly NotificationQueueService _notifications;

    public BillingService(AppDbContext db, NotificationQueueService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<int> GenerateInvoicesForPeriod(string period, DateOnly dueDate)
    {
        var enrollments = await _db.Enrollments.IgnoreQueryFilters()
            .Include(e => e.Student)
            .Where(e => e.Student != null && e.Student.Status == StudentStatus.Active)
            .ToListAsync();

        var activeStructures = await _db.FeeStructures.IgnoreQueryFilters()
            .Where(f => f.IsActive)
            .ToDictionaryAsync(f => f.ClassId);

        var discountRules = await _db.DiscountRules.IgnoreQueryFilters()
            .Where(d => d.IsActive)
            .ToListAsync();

        var existingKeys = (await _db.Invoices.IgnoreQueryFilters()
                .Where(i => i.BillingPeriod == period)
                .Select(i => new { i.StudentId, i.ClassId })
                .ToListAsync())
            .Select(k => (k.StudentId, k.ClassId))
            .ToHashSet();

        var created = 0;
        foreach (var enrollment in enrollments)
        {
            if (!activeStructures.TryGetValue(enrollment.ClassId, out var structure)) continue;
            if (existingKeys.Contains((enrollment.StudentId, enrollment.ClassId))) continue;

            var discountPercent = discountRules
                .Where(d => d.StudentId == enrollment.StudentId)
                .Sum(d => d.PercentOff);
            discountPercent = Math.Min(discountPercent, 100);

            var amount = structure.Amount;
            var discountAmount = Math.Round(amount * discountPercent / 100m, 2);

            _db.Invoices.Add(new Invoice
            {
                InstituteId = enrollment.InstituteId,
                StudentId = enrollment.StudentId,
                ClassId = enrollment.ClassId,
                BillingPeriod = period,
                Amount = amount,
                DiscountAmount = discountAmount,
                TotalDue = amount - discountAmount,
                DueDate = dueDate,
                Status = InvoiceStatus.Pending,
            });
            created++;
        }

        await _db.SaveChangesAsync();
        return created;
    }

    public async Task SendDueDateRemindersAndFlipOverdue()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var openInvoices = await _db.Invoices.IgnoreQueryFilters()
            .Include(i => i.Student)
            .Include(i => i.Class)
            .Where(i => i.Status == InvoiceStatus.Pending || i.Status == InvoiceStatus.Partial)
            .ToListAsync();

        foreach (var invoice in openInvoices)
        {
            if (invoice.Student is null) continue;
            var parentUserIds = await _db.ParentLinks.IgnoreQueryFilters()
                .Where(p => p.StudentId == invoice.StudentId)
                .Select(p => p.ParentUserId)
                .ToListAsync();

            var placeholders = new Dictionary<string, string>
            {
                ["StudentName"] = invoice.Student.FullName,
                ["Subject"] = invoice.Class?.Subject ?? "",
                ["BillingPeriod"] = invoice.BillingPeriod,
                ["TotalDue"] = invoice.TotalDue.ToString("0.00"),
                ["DueDate"] = invoice.DueDate.ToString("yyyy-MM-dd"),
            };

            var daysUntilDue = invoice.DueDate.DayNumber - today.DayNumber;

            if (daysUntilDue == 7 && invoice.ReminderT7SentAt is null)
            {
                foreach (var parentUserId in parentUserIds)
                {
                    await _notifications.Enqueue(invoice.InstituteId, NotificationEventType.FeeReminderT7, parentUserId, placeholders);
                }
                invoice.ReminderT7SentAt = DateTime.UtcNow;
            }
            else if (daysUntilDue == 1 && invoice.ReminderT1SentAt is null)
            {
                foreach (var parentUserId in parentUserIds)
                {
                    await _notifications.Enqueue(invoice.InstituteId, NotificationEventType.FeeReminderT1, parentUserId, placeholders);
                }
                invoice.ReminderT1SentAt = DateTime.UtcNow;
            }
            else if (daysUntilDue < 0 && invoice.Status != InvoiceStatus.Overdue)
            {
                invoice.Status = InvoiceStatus.Overdue;
                foreach (var parentUserId in parentUserIds)
                {
                    await _notifications.Enqueue(invoice.InstituteId, NotificationEventType.FeeOverdue, parentUserId, placeholders);
                }
            }
        }

        await _db.SaveChangesAsync();
    }
}
