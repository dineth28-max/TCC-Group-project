using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Csmas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

/// <summary>
/// Institute branding and configuration (Phase 13): name/address/contact, logo, theme color, and
/// the attendance-flagging threshold percentage Phase 3's threshold job previously only accepted
/// as a hardcoded/query-string default. System Admin only — a single institute-wide settings row,
/// not a Branch Admin concern.
/// </summary>
[ApiController]
[Route("api/settings")]
[Authorize(Roles = "SystemAdmin")]
public class SettingsController : TenantScopedController
{
    private readonly AppDbContext _db;
    private readonly SecretEncryptionService _encryption;
    private readonly AuditLogService _auditLog;

    public SettingsController(AppDbContext db, SecretEncryptionService encryption, AuditLogService auditLog)
    {
        _db = db;
        _encryption = encryption;
        _auditLog = auditLog;
    }

    [HttpGet]
    public async Task<ActionResult<InstituteSettingsResponse>> Get()
    {
        var institute = await _db.Institutes.FirstAsync(i => i.Id == CurrentInstituteId);
        return Ok(ToResponse(institute));
    }

    [HttpPut]
    public async Task<ActionResult<InstituteSettingsResponse>> Update([FromBody] UpdateInstituteSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Institute name is required." });
        }
        if (request.AttendanceThresholdPercent < 0 || request.AttendanceThresholdPercent > 100)
        {
            return BadRequest(new { message = "Attendance threshold must be between 0 and 100." });
        }

        var institute = await _db.Institutes.FirstAsync(i => i.Id == CurrentInstituteId);
        institute.Name = request.Name.Trim();
        institute.Address = request.Address;
        institute.ContactEmail = request.ContactEmail;
        institute.LogoUrl = request.LogoUrl;
        institute.ThemeColor = request.ThemeColor;
        institute.AttendanceThresholdPercent = request.AttendanceThresholdPercent;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(institute));
    }

    [HttpGet("payment-account")]
    public async Task<ActionResult<PaymentAccountResponse>> GetPaymentAccount()
    {
        var account = await _db.PaymentAccountSettings.FirstOrDefaultAsync(p => p.InstituteId == CurrentInstituteId);
        return Ok(ToPaymentAccountResponse(account));
    }

    [HttpPut("payment-account")]
    public async Task<ActionResult<PaymentAccountResponse>> UpdatePaymentAccount([FromBody] UpdatePaymentAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.GatewayProvider))
        {
            return BadRequest(new { message = "Gateway provider is required." });
        }

        var account = await _db.PaymentAccountSettings.FirstOrDefaultAsync(p => p.InstituteId == CurrentInstituteId);
        if (account is null)
        {
            account = new PaymentAccountSettings { InstituteId = CurrentInstituteId };
            _db.PaymentAccountSettings.Add(account);
        }

        account.GatewayProvider = request.GatewayProvider.Trim();
        account.AccountIdentifier = string.IsNullOrWhiteSpace(request.AccountIdentifier) ? null : request.AccountIdentifier.Trim();
        // Blank API key/secret on update means "leave the existing credential unchanged" — they're
        // never echoed back by GetPaymentAccount, so the form has nothing to resubmit unless the
        // admin is deliberately replacing the credential.
        if (!string.IsNullOrWhiteSpace(request.ApiKey)) account.ApiKeyEncrypted = _encryption.Encrypt(request.ApiKey.Trim());
        if (!string.IsNullOrWhiteSpace(request.ApiSecret)) account.ApiSecretEncrypted = _encryption.Encrypt(request.ApiSecret.Trim());
        if (!string.IsNullOrWhiteSpace(request.WebhookSecret)) account.WebhookSecretEncrypted = _encryption.Encrypt(request.WebhookSecret.Trim());
        account.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _auditLog.Record(CurrentInstituteId, CurrentUserId, "PaymentAccount.Updated", account.GatewayProvider);
        return Ok(ToPaymentAccountResponse(account));
    }

    [HttpGet("revenue-split")]
    public async Task<ActionResult<RevenueSplitResponse>> GetRevenueSplit()
    {
        var split = await _db.RevenueSplitSettings.FirstOrDefaultAsync(r => r.InstituteId == CurrentInstituteId);
        return Ok(new RevenueSplitResponse(split?.CommissionPercent ?? 2.00m));
    }

    [HttpPut("revenue-split")]
    public async Task<ActionResult<RevenueSplitResponse>> UpdateRevenueSplit([FromBody] UpdateRevenueSplitRequest request)
    {
        if (request.CommissionPercent < 0 || request.CommissionPercent > 100)
        {
            return BadRequest(new { message = "Commission percent must be between 0 and 100." });
        }

        var split = await _db.RevenueSplitSettings.FirstOrDefaultAsync(r => r.InstituteId == CurrentInstituteId);
        if (split is null)
        {
            split = new RevenueSplitSettings { InstituteId = CurrentInstituteId };
            _db.RevenueSplitSettings.Add(split);
        }

        split.CommissionPercent = request.CommissionPercent;
        split.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _auditLog.Record(CurrentInstituteId, CurrentUserId, "RevenueSplit.Updated", $"{split.CommissionPercent}%");
        return Ok(new RevenueSplitResponse(split.CommissionPercent));
    }

    [HttpGet("institute-bank-details")]
    public async Task<ActionResult<InstituteBankDetailResponse>> GetInstituteBankDetails()
    {
        var detail = await _db.InstituteBankDetails.FirstOrDefaultAsync(d => d.InstituteId == CurrentInstituteId);
        if (detail is null) return Ok(new InstituteBankDetailResponse(null, null, null, null, null, false));

        var accountNumber = _encryption.Decrypt(detail.AccountNumberEncrypted);
        return Ok(new InstituteBankDetailResponse(
            detail.AccountHolderName, detail.BankName, Mask(accountNumber), detail.BranchName, detail.RoutingOrSwiftCode, true));
    }

    [HttpPut("institute-bank-details")]
    public async Task<ActionResult<InstituteBankDetailResponse>> SaveInstituteBankDetails([FromBody] SaveInstituteBankDetailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountHolderName) || string.IsNullOrWhiteSpace(request.BankName) || string.IsNullOrWhiteSpace(request.AccountNumber))
        {
            return BadRequest(new { message = "Account holder name, bank name, and account number are all required." });
        }

        var detail = await _db.InstituteBankDetails.FirstOrDefaultAsync(d => d.InstituteId == CurrentInstituteId);
        if (detail is null)
        {
            detail = new InstituteBankDetail { InstituteId = CurrentInstituteId };
            _db.InstituteBankDetails.Add(detail);
        }

        detail.AccountHolderName = request.AccountHolderName.Trim();
        detail.BankName = request.BankName.Trim();
        detail.AccountNumberEncrypted = _encryption.Encrypt(request.AccountNumber.Trim());
        detail.BranchName = string.IsNullOrWhiteSpace(request.BranchName) ? null : request.BranchName.Trim();
        detail.RoutingOrSwiftCode = string.IsNullOrWhiteSpace(request.RoutingOrSwiftCode) ? null : request.RoutingOrSwiftCode.Trim();
        detail.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _auditLog.Record(CurrentInstituteId, CurrentUserId, "InstituteBankDetails.Updated", detail.BankName);

        return Ok(new InstituteBankDetailResponse(
            detail.AccountHolderName, detail.BankName, Mask(request.AccountNumber.Trim()), detail.BranchName, detail.RoutingOrSwiftCode, true));
    }

    private static InstituteSettingsResponse ToResponse(Domain.Institute i) =>
        new(i.Id, i.Name, i.Address, i.ContactEmail, i.LogoUrl, i.ThemeColor, i.AttendanceThresholdPercent);

    private static PaymentAccountResponse ToPaymentAccountResponse(PaymentAccountSettings? a) => new(
        a?.GatewayProvider, a?.AccountIdentifier, !string.IsNullOrEmpty(a?.ApiKeyEncrypted),
        !string.IsNullOrEmpty(a?.ApiSecretEncrypted), !string.IsNullOrEmpty(a?.WebhookSecretEncrypted));

    private static string Mask(string value) =>
        value.Length <= 4 ? value : new string('*', value.Length - 4) + value[^4..];
}
