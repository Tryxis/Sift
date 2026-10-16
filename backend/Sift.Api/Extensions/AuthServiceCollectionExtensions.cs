using System.Security.Claims;
using System.Threading.RateLimiting;
using AspNet.Security.OpenId.Steam;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Data;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Infrastructure.Security;

namespace Sift.Api.Extensions;

public static class AuthServiceCollectionExtensions
{
    public const string SteamCallbackPath = "/api/auth/steam/callback";
    public const string SyncRateLimitPolicy = "profile-sync";
    public const string SteamLookupRateLimitPolicy = "steam-lookup";

    /// <summary>
    /// Sign in with Steam (OpenID 2.0, verified with Steam server-side), held in an encrypted cookie.
    /// Every API endpoint needs a signed-in user unless marked otherwise, and writes to a library
    /// additionally need the ProfileOwner policy.
    /// </summary>
    public static IServiceCollection AddSteamSignIn(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        // Hosted, cookies are only ever sent over HTTPS, whatever the proxy in front reports. Development
        // keeps plain HTTP working (e.g. testing from a phone on the LAN), which also rules out __Host-.
        var isDevelopment = environment.IsDevelopment();
        var cookieSecurity = isDevelopment ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;

        services.AddOptions<AuthOptions>()
            .Bind(configuration.GetSection(AuthOptions.SectionName))
            .Validate(options => options.HasValidAllowList(), "Auth:AllowedSteamIds must only contain SteamID64s.")
            .Validate(options => options.SessionDays is >= 1 and <= 365, "Auth:SessionDays must be between 1 and 365.")
            .Validate(options => options.MaxSessionDays >= options.SessionDays && options.MaxSessionDays <= 365,
                "Auth:MaxSessionDays must be at least Auth:SessionDays and at most 365.")
            .ValidateOnStart();


        // Cookie encryption keys live in Postgres, so sign-ins survive restarts and redeploys
        // (a container's own filesystem is wiped each time). Hosted, they're stored encrypted under a
        // key that only the host's secrets hold; Development may run without one (stored in plain).
        services.AddOptions<KeyRingEncryptionOptions>()
            .Bind(configuration.GetSection(KeyRingEncryptionOptions.SectionName))
            .Validate(options => options.IsValid,
                "DataProtection:KeyEncryptionKey must be 32 random bytes, base64-encoded (openssl rand -base64 32).")
            .Validate(options => isDevelopment || options.IsConfigured,
                "DataProtection:KeyEncryptionKey is not set. Generate one with `openssl rand -base64 32` and set the " +
                "DataProtection__KeyEncryptionKey environment variable (Render dashboard > Environment).")
            .ValidateOnStart();
        services.AddDataProtection()
            .SetApplicationName("Sift")
            .PersistKeysToDbContext<AppDbContext>();
        services.AddOptions<KeyManagementOptions>()
            .Configure<IOptions<KeyRingEncryptionOptions>>((keyManagement, encryption) =>
            {
                if (encryption.Value.TryGetKey(out var key))
                {
                    keyManagement.XmlEncryptor = new AesGcmXmlEncryptor(key);
                }
            });

        // Sessions are kept server-side, so signing out (or out everywhere) really ends them.
        services.AddSingleton<DbTicketStore>();
        services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<DbTicketStore>((cookie, store) => cookie.SessionStore = store);

        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                // __Host- makes the browser refuse the cookie unless it's Secure, host-only and Path=/,
                // so nothing on another subdomain can set or overwrite it.
                options.Cookie.Name = isDevelopment ? "sift_session" : "__Host-sift_session";
                options.Cookie.HttpOnly = true;
                // Lax (not Strict) so the cookie set on Steam's redirect back is sent on the next page load.
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = cookieSecurity;
                options.Cookie.Path = "/";
                options.SlidingExpiration = true;
                options.Events = new CookieAuthenticationEvents
                {
                    // An API answers with status codes rather than redirecting to a login page.
                    OnRedirectToLogin = context =>
                        WriteProblemAsync(context.HttpContext, StatusCodes.Status401Unauthorized,
                            "Sign in required", "Sign in with Steam to continue."),
                    OnRedirectToAccessDenied = context =>
                        WriteProblemAsync(context.HttpContext, StatusCodes.Status403Forbidden,
                            "Read-only", "You can only change your own library."),
                    // Ends sessions that are past their absolute lifetime, and sessions of anyone
                    // since removed from the allow-list.
                    OnValidatePrincipal = async context =>
                    {
                        var services = context.HttpContext.RequestServices;
                        var auth = services.GetRequiredService<IOptions<AuthOptions>>().Value;
                        var now = services.GetRequiredService<TimeProvider>().GetUtcNow();
                        var signedInAt = context.Principal?.GetSignedInAt();
                        if (context.Principal?.GetSteamId() is not { } steamId ||
                            !auth.IsAllowed(steamId) ||
                            signedInAt is null ||
                            signedInAt > now.AddMinutes(5) ||
                            now - signedInAt > TimeSpan.FromDays(auth.MaxSessionDays))
                        {
                            context.RejectPrincipal();
                            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                        }
                    },
                };
            })
            .AddSteam(options =>
            {
                options.CallbackPath = SteamCallbackPath;
                // Steam returns with a top-level GET, which Lax cookies accompany. The default (None)
                // would also need Secure, which breaks signing in over plain HTTP on a LAN in development.
                options.CorrelationCookie.SameSite = SameSiteMode.Lax;
                options.CorrelationCookie.SecurePolicy = cookieSecurity;
                options.CorrelationCookie.HttpOnly = true;
                options.Events.OnTicketReceived = OnSteamTicketReceivedAsync;
                options.Events.OnRemoteFailure = OnSteamRemoteFailureAsync;
            });

        services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<IOptions<AuthOptions>>((cookie, auth) =>
                cookie.ExpireTimeSpan = TimeSpan.FromDays(auth.Value.SessionDays));

        services.AddSingleton<IAuthorizationHandler, ProfileOwnerHandler>();
        services.AddSingleton<IAuthorizationHandler, ViewerHandler>();
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(ProfileOwnerRequirement.PolicyName, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new ProfileOwnerRequirement()))
            .AddPolicy(ViewerRequirement.PolicyName, policy => policy
                .AddRequirements(new ViewerRequirement()));

        // Limits are per signed-in account, or per client address for guests, who get less. Behind a
        // proxy the address is the real client's, from X-Forwarded-For, once forwarded headers are enabled.
        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.OnRejected = (context, _) => new ValueTask(WriteProblemAsync(context.HttpContext,
                StatusCodes.Status429TooManyRequests, "Too many requests", "Too many requests in a short time. Wait a few minutes and try again."));

            limiter.GlobalLimiter = PartitionedRateLimiter.CreateChained(
                // A ceiling on everything, high enough for a large import (one request per game).
                PartitionedRateLimiter.Create<HttpContext, string>(context =>
                    context.Request.Path.StartsWithSegments("/api/health")
                        ? RateLimitPartition.GetNoLimiter("health")
                        : FixedWindow(PartitionKey(context), permits: 3000, TimeSpan.FromMinutes(5))),
                // All guests together: a hard cap on how much of Sift's Steam quota guests can spend,
                // however many addresses they come from.
                PartitionedRateLimiter.Create<HttpContext, string>(context =>
                    IsGuest(context) && HttpMethods.IsPost(context.Request.Method) &&
                    context.Request.Path.StartsWithSegments("/api/profiles/sync")
                        ? FixedWindow("all-guest-syncs", permits: 100, TimeSpan.FromHours(1))
                        : RateLimitPartition.GetNoLimiter("not-a-guest-sync")));

            // Each sync calls the Steam Web API several times with Sift's key.
            limiter.AddPolicy(SyncRateLimitPolicy, context =>
                FixedWindow(PartitionKey(context), permits: IsGuest(context) ? 10 : 30, TimeSpan.FromMinutes(5)));

            // Live Steam lookups (store details, achievements, wishlists) share Sift's Steam quota.
            limiter.AddPolicy(SteamLookupRateLimitPolicy, context =>
                FixedWindow(PartitionKey(context), permits: IsGuest(context) ? 200 : 600, TimeSpan.FromMinutes(5)));
        });

        return services;
    }

    private static bool IsGuest(HttpContext context) => context.User.GetSteamId() is null;

    private static string PartitionKey(HttpContext context) =>
        context.User.GetSteamId() is { } steamId
            ? $"user:{steamId}"
            : $"guest:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";

    private static RateLimitPartition<string> FixedWindow(string key, int permits, TimeSpan window) =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permits,
            Window = window,
            QueueLimit = 0,
        });

    /// <summary>Replaces Steam's claims with Sift's SteamID and sign-in time claims, or turns the sign-in away.</summary>
    private static Task OnSteamTicketReceivedAsync(TicketReceivedContext context)
    {
        var services = context.HttpContext.RequestServices;
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(AuthServiceCollectionExtensions));
        var auth = services.GetRequiredService<IOptions<AuthOptions>>().Value;
        var steamId = SiftClaims.SteamIdFromClaimedId(context.Principal?.GetSteamClaimedId());

        if (steamId is null || !auth.IsAllowed(steamId))
        {
            logger.LogWarning("Steam sign-in refused for {ClaimedId}",
                steamId ?? context.Principal?.GetSteamClaimedId() ?? "(none)");
            // HandleResponse, not Fail: a failed ticket would still be signed in.
            context.Response.Redirect(steamId is null ? "/?signin=failed" : "/?signin=denied");
            context.HandleResponse();
            return Task.CompletedTask;
        }

        context.Principal = SiftClaims.CreatePrincipal(
            steamId, services.GetRequiredService<TimeProvider>().GetUtcNow(), CookieAuthenticationDefaults.AuthenticationScheme);
        logger.LogInformation("Signed in {SteamId} with Steam", steamId);
        return Task.CompletedTask;
    }

    private static Task OnSteamRemoteFailureAsync(RemoteFailureContext context)
    {
        context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger(typeof(AuthServiceCollectionExtensions))
            .LogWarning(context.Failure, "Steam sign-in failed");
        context.Response.Redirect("/?signin=failed");
        context.HandleResponse();
        return Task.CompletedTask;
    }

    private static string? GetSteamClaimedId(this ClaimsPrincipal principal) =>
        principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    private static Task WriteProblemAsync(HttpContext context, int status, string title, string detail)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(
            new ProblemDetails { Status = status, Title = title, Detail = detail },
            options: null,
            contentType: "application/problem+json");
    }
}
