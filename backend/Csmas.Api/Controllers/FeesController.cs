using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/fees")]
[Authorize(Roles = "SystemAdmin,BranchAdmin")]
public class FeesController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly BillingService _billingService;

    public FeesController(AppDbContext db, BillingService billingService)
    {
        _db = db;
        _billingService = billingService;
    }

    [HttpGet("structures")]
    public async Task<ActionResult<List<FeeStructureResponse>>> ListStructures()
    {
        var query = _db.FeeStructures.Include(f => f.Class).AsQueryable();
        if (IsBranchScoped) query = query.Where(f => f.Class!.BranchId == CurrentBranchId);
        var structures = await query.ToListAsync();
        return Ok(structures.Select(f => new FeeStructureResponse(
            f.Id, f.ClassId, f.Class?.Subject ?? string.Empty, f.Amount, f.EffectiveFrom, f.IsActive)).ToList());
    }

    [HttpPost("structures")]
    public async Task<ActionResult<FeeStructureResponse>> CreateStructure([FromBody] CreateFeeStructureRequest request)
    {
        var klass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == request.ClassId);
        if (klass is null) return BadRequest(new { message = "Class not found." });
        if (IsBranchScoped && klass.BranchId != CurrentBranchId) return Forbid();
        if (request.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero." });

        var existing = await _db.FeeStructures.FirstOrDefaultAsync(f => f.ClassId == request.ClassId && f.IsActive);
        if (existing is not null) existing.IsActive = false; // supersede the previous fee for this class

        var structure = new FeeStructure
        {
            InstituteId = klass.InstituteId,
            ClassId = request.ClassId,
            Amount = request.Amount,
        };
        _db.FeeStructures.Add(structure);
        await _db.SaveChangesAsync();

        return Ok(new FeeStructureResponse(structure.Id, klass.Id, klass.Subject, structure.Amount, structure.EffectiveFrom, true));
    }

    [HttpGet("discounts")]
    public async Task<ActionResult<List<DiscountResponse>>> ListDiscounts()
    {
        var query = _db.DiscountRules.Include(d => d.Student).AsQueryable();
        if (IsBranchScoped) query = query.Where(d => d.Student!.BranchId == CurrentBranchId);
        var discounts = await query.ToListAsync();
        return Ok(discounts.Select(d => new DiscountResponse(
            d.Id, d.StudentId, d.Student?.FullName ?? string.Empty, d.Type.ToString(), d.PercentOff, d.IsActive)).ToList());
    }

    [HttpPost("discounts")]
    public async Task<ActionResult<DiscountResponse>> CreateDiscount([FromBody] CreateDiscountRequest request)
    {
        var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == request.StudentId);
        if (student is null) return BadRequest(new { message = "Student not found." });
        if (IsBranchScoped && student.BranchId != CurrentBranchId) return Forbid();
        if (!Enum.TryParse<DiscountType>(request.Type, true, out var type))
        {
            return BadRequest(new { message = "Type must be Sibling, Scholarship, or Other." });
        }
        if (request.PercentOff <= 0 || request.PercentOff > 100)
        {
            return BadRequest(new { message = "PercentOff must be between 0 and 100." });
        }

        var discount = new DiscountRule
        {
            InstituteId = student.InstituteId,
            StudentId = student.Id,
            Type = type,
            PercentOff = request.PercentOff,
        };
        _db.DiscountRules.Add(discount);
        await _db.SaveChangesAsync();

        return Ok(new DiscountResponse(discount.Id, student.Id, student.FullName, discount.Type.ToString(), discount.PercentOff, true));
    }

    [HttpDelete("discounts/{id:int}")]
    public async Task<IActionResult> DeactivateDiscount(int id)
    {
        var discount = await _db.DiscountRules.Include(d => d.Student).FirstOrDefaultAsync(d => d.Id == id);
        if (discount is null) return NotFound();
        if (IsBranchScoped && discount.Student?.BranchId != CurrentBranchId) return NotFound();
        discount.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("invoices")]
    public async Task<ActionResult<List<InvoiceResponse>>> ListInvoices(
        [FromQuery] int? studentId, [FromQuery] string? period, [FromQuery] string? status)
    {
        var query = _db.Invoices.Include(i => i.Student).Include(i => i.Class).AsQueryable();
        if (IsBranchScoped) query = query.Where(i => i.Student!.BranchId == CurrentBranchId);
        if (studentId.HasValue) query = query.Where(i => i.StudentId == studentId);
        if (!string.IsNullOrWhiteSpace(period)) query = query.Where(i => i.BillingPeriod == period);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<InvoiceStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(i => i.Status == parsedStatus);
        }

        var invoices = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return Ok(invoices.Select(ToResponse).ToList());
    }

    [HttpPost("invoices/{id:int}/payments")]
    public async Task<ActionResult<InvoiceResponse>> RecordPayment(int id, [FromBody] RecordPaymentRequest request)
    {
        var invoice = await _db.Invoices.Include(i => i.Student).Include(i => i.Class).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();
        if (IsBranchScoped && invoice.Student?.BranchId != CurrentBranchId) return NotFound();
        if (request.Amount <= 0) return BadRequest(new { message = "Payment amount must be greater than zero." });

        _db.Payments.Add(new Payment
        {
            InstituteId = invoice.InstituteId,
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            Method = request.Method,
            RecordedByUserId = CurrentUserId,
        });

        invoice.AmountPaid += request.Amount;
        invoice.Status = invoice.AmountPaid >= invoice.TotalDue
            ? InvoiceStatus.Paid
            : invoice.AmountPaid > 0
                ? InvoiceStatus.Partial
                : invoice.Status;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(invoice));
    }

    [HttpPost("run-billing")]
    public async Task<ActionResult<RunBillingResponse>> RunBilling([FromQuery] string? period)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var billingPeriod = period ?? $"{today.Year:D4}-{today.Month:D2}";
        var created = await _billingService.GenerateInvoicesForPeriod(billingPeriod, today.AddDays(14));
        await _billingService.SendDueDateRemindersAndFlipOverdue();
        return Ok(new RunBillingResponse(created, billingPeriod));
    }

    [HttpGet("collection-summary")]
    public async Task<ActionResult<CollectionSummaryResponse>> CollectionSummary([FromQuery] string? period)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var billingPeriod = period ?? $"{today.Year:D4}-{today.Month:D2}";

        var summaryQuery = _db.Invoices.Where(i => i.BillingPeriod == billingPeriod);
        if (IsBranchScoped) summaryQuery = summaryQuery.Where(i => i.Student!.BranchId == CurrentBranchId);
        var invoices = await summaryQuery.ToListAsync();
        var totalInvoiced = invoices.Sum(i => i.TotalDue);
        var totalCollected = invoices.Sum(i => i.AmountPaid);
        var rate = totalInvoiced == 0 ? 0 : Math.Round(100m * totalCollected / totalInvoiced, 1);

        return Ok(new CollectionSummaryResponse(billingPeriod, totalInvoiced, totalCollected, rate));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? period)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var billingPeriod = period ?? $"{today.Year:D4}-{today.Month:D2}";

        var query = _db.Invoices.Include(i => i.Student).Include(i => i.Class).Where(i => i.BillingPeriod == billingPeriod);
        if (IsBranchScoped) query = query.Where(i => i.Student!.BranchId == CurrentBranchId);
        var invoices = await query.OrderBy(i => i.Student!.FullName).ToListAsync();

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("Fees");
        string[] headers = { "Student", "Subject", "Period", "Amount", "Discount", "Total Due", "Paid", "Status", "Due Date" };
        for (var col = 0; col < headers.Length; col++) sheet.Cell(1, col + 1).Value = headers[col];

        var row = 2;
        foreach (var i in invoices)
        {
            sheet.Cell(row, 1).Value = i.Student?.FullName ?? "";
            sheet.Cell(row, 2).Value = i.Class?.Subject ?? "";
            sheet.Cell(row, 3).Value = i.BillingPeriod;
            sheet.Cell(row, 4).Value = i.Amount;
            sheet.Cell(row, 5).Value = i.DiscountAmount;
            sheet.Cell(row, 6).Value = i.TotalDue;
            sheet.Cell(row, 7).Value = i.AmountPaid;
            sheet.Cell(row, 8).Value = i.Status.ToString();
            sheet.Cell(row, 9).Value = i.DueDate.ToString("yyyy-MM-dd");
            row++;
        }
        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"fees-{billingPeriod}.xlsx");
    }

    private static InvoiceResponse ToResponse(Invoice i) => new(
        i.Id, i.StudentId, i.Student?.FullName ?? string.Empty, i.ClassId, i.Class?.Subject ?? string.Empty,
        i.BillingPeriod, i.Amount, i.DiscountAmount, i.TotalDue, i.AmountPaid, i.Status.ToString(), i.DueDate);
}
