namespace Csmas.Api.Services;

/// <summary>
/// Unattended monthly cycle from plan.md §14.5: generates invoices on the 1st of each month and
/// checks due-date reminders/overdue flips daily. Runs once per UTC day; the admin-facing
/// "run billing now" endpoint exists purely so this doesn't have to be tested by waiting a month.
/// </summary>
public class BillingBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BillingBackgroundService> _logger;

    public BillingBackgroundService(IServiceScopeFactory scopeFactory, ILogger<BillingBackgroundService> logger)
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
                await RunDailyCycle();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Billing background cycle failed.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task RunDailyCycle()
    {
        using var scope = _scopeFactory.CreateScope();
        var billing = scope.ServiceProvider.GetRequiredService<BillingService>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (today.Day == 1)
        {
            var period = $"{today.Year:D4}-{today.Month:D2}";
            await billing.GenerateInvoicesForPeriod(period, today.AddDays(14));
        }

        await billing.SendDueDateRemindersAndFlipOverdue();
    }
}
