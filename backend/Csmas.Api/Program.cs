using System.Text;
using Csmas.Api.Auth;
using Csmas.Api.Data;
using Csmas.Api.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// ---- Configuration ----
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

// ---- Database ----
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 35))));

// ---- Tenant isolation ----
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, HttpContextTenantProvider>();

// ---- Auth ----
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<Csmas.Api.Services.QrCodeService>();
builder.Services.AddScoped<Csmas.Api.Services.NotificationTemplateService>();
builder.Services.AddScoped<Csmas.Api.Services.NotificationQueueService>();
builder.Services.AddScoped<Csmas.Api.Services.BillingService>();
builder.Services.AddHostedService<Csmas.Api.Services.BillingBackgroundService>();

// ---- Notification Engine (Phase 6) ----
builder.Services.Configure<Csmas.Api.Services.SmtpOptions>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddSingleton<Csmas.Api.Services.IEmailSender, Csmas.Api.Services.SmtpEmailSender>();
builder.Services.AddHostedService<Csmas.Api.Services.NotificationDeliveryBackgroundService>();

// ---- Dashboard KPI caching (Phase 7) ----
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<Csmas.Api.Services.KpiCacheService>();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // keep "sub", "instituteId", etc. as literal claim types
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromSeconds(30),
            RoleClaimType = "role",
            NameClaimType = "sub",
        };
    });
builder.Services.AddAuthorization();

// ---- CORS (frontend origin only) ----
var frontendOrigin = builder.Configuration["FrontendOrigin"] ?? "http://localhost";
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(frontendOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ---- Rate limiting: 100 req/min PER USER (falls back to per-IP for unauthenticated requests),
// not one shared global budget — AddSlidingWindowLimiter without a partition key would otherwise
// let one user's traffic throttle everyone else's. ----
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("PerUser", context =>
    {
        var partitionKey = context.User.FindFirst("sub")?.Value
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous";

        return System.Threading.RateLimiting.RateLimitPartition.GetSlidingWindowLimiter(partitionKey, _ =>
            new System.Threading.RateLimiting.SlidingWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4,
            });
    });
});

// ---- Trust the reverse proxy's X-Forwarded-For so RemoteIpAddress (used by the rate limiter's
// per-IP fallback for anonymous requests) reflects the real client, not nginx's container IP.
// KnownNetworks/KnownProxies are cleared because the immediate hop is always the nginx
// container on the internal Docker network, whose address isn't fixed across deployments. ----
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseForwardedHeaders();

// ---- Apply EF Core migrations automatically on startup (container-friendly) ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    await DbSeeder.SeedAsync(db, passwordHasher);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ---- Global exception handling: never let a raw stack trace/exception message reach the
// client, regardless of ASPNETCORE_ENVIRONMENT — log the real exception server-side, return a
// generic human-readable envelope (plan.md §8). Must be the outermost middleware. ----
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        if (exceptionFeature is not null)
        {
            context.RequestServices.GetRequiredService<ILogger<Program>>()
                .LogError(exceptionFeature.Error, "Unhandled exception on {Path}.", exceptionFeature.Path);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred. Please try again." });
    });
});

app.UseCors("Frontend");
// Authentication must run before the rate limiter so its partition-key resolver (which reads
// the "sub" claim) sees a populated ClaimsPrincipal — otherwise every request, authenticated or
// not, falls back to the shared per-IP partition regardless of which user it actually belongs to.
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// A real readiness check, not just "the process is running" — an outside monitor needs to know
// if the backend can actually reach its database, since that's the dependency most likely to fail.
app.MapGet("/healthz", async (AppDbContext db) =>
{
    var dbReachable = await db.Database.CanConnectAsync();
    var body = new { status = dbReachable ? "ok" : "degraded", service = "backend", database = dbReachable ? "connected" : "unreachable" };
    return dbReachable ? Results.Ok(body) : Results.Json(body, statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.MapControllers().RequireRateLimiting("PerUser");

app.Run();
