using Csmas.Api.Auth;
using Csmas.Api.Data;
using Csmas.Api.Domain;
using Csmas.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Csmas.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "csmas_refresh";
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly TokenService _tokenService;

    public AuthController(AppDbContext db, IPasswordHasher<User> passwordHasher, TokenService tokenService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (user.LockoutUntil is { } lockoutUntil && lockoutUntil > DateTime.UtcNow)
        {
            return Unauthorized(new
            {
                message = $"Account locked due to repeated failed attempts. Try again after {lockoutUntil:HH:mm} UTC."
            });
        }

        var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedAttempts)
            {
                user.LockoutUntil = DateTime.UtcNow.Add(LockoutDuration);
                user.FailedLoginCount = 0;
            }
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (user.Status != UserStatus.Active)
        {
            return Unauthorized(new { message = "This account is not active. Contact your administrator." });
        }

        user.FailedLoginCount = 0;
        user.LockoutUntil = null;

        var refreshPlainText = _tokenService.CreateRefreshTokenPlainText();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = TokenService.Hash(refreshPlainText),
            ExpiresAt = DateTime.UtcNow.Add(_tokenService.RefreshTokenLifetime),
        });
        await _db.SaveChangesAsync();

        SetRefreshCookie(refreshPlainText);
        var accessToken = _tokenService.CreateAccessToken(user);
        return Ok(new LoginResponse(accessToken));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh()
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var plainText) || string.IsNullOrEmpty(plainText))
        {
            return Unauthorized(new { message = "No active session." });
        }

        var hash = TokenService.Hash(plainText);
        var token = await _db.RefreshTokens.IgnoreQueryFilters()
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (token is null || !token.IsActive || token.User is null)
        {
            Response.Cookies.Delete(RefreshCookieName);
            return Unauthorized(new { message = "Session expired. Please sign in again." });
        }

        // Rotate: revoke the old refresh token, issue a new one.
        token.RevokedAt = DateTime.UtcNow;
        var newPlainText = _tokenService.CreateRefreshTokenPlainText();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = token.User.Id,
            TokenHash = TokenService.Hash(newPlainText),
            ExpiresAt = DateTime.UtcNow.Add(_tokenService.RefreshTokenLifetime),
        });
        await _db.SaveChangesAsync();

        SetRefreshCookie(newPlainText);
        var accessToken = _tokenService.CreateAccessToken(token.User);
        return Ok(new LoginResponse(accessToken));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(RefreshCookieName, out var plainText) && !string.IsNullOrEmpty(plainText))
        {
            var hash = TokenService.Hash(plainText);
            var token = await _db.RefreshTokens.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TokenHash == hash);
            if (token is not null)
            {
                token.RevokedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }
        Response.Cookies.Delete(RefreshCookieName);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me()
    {
        var userId = int.Parse(User.FindFirst("sub")!.Value);
        var user = await _db.Users.Include(u => u.Institute).FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new MeResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.InstituteId,
            user.Institute?.Name ?? string.Empty,
            user.BranchId));
    }

    private void SetRefreshCookie(string plainText)
    {
        Response.Cookies.Append(RefreshCookieName, plainText, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.Add(_tokenService.RefreshTokenLifetime),
            Path = "/api/auth",
        });
    }
}
