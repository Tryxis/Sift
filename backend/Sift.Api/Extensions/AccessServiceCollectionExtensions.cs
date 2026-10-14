using System.Threading.RateLimiting;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Sift.Api.Configuration;
using Sift.Api.Controllers;
using Sift.Api.Infrastructure.Access;

namespace Sift.Api.Extensions;

public static class AccessServiceCollectionExtensions
{
    /// <summary>The temporary shared-password gate. Off unless Access:Password is set.</summary>
    public static IServiceCollection AddAccessGate(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AccessOptions>(configuration.GetSection(AccessOptions.SectionName));
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<AccessTokenService>();

        // Ten sign-in attempts per client per five minutes.
        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.AddPolicy(AccessController.SignInRateLimitPolicy, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    ClientKey(context),
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(5),
                        QueueLimit = 0,
                    }));
        });

        return services;
    }

    // Behind a host's proxy every request comes from the proxy, so prefer the original client address.
    private static string ClientKey(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].ToString();
        var first = forwarded.Split(',', 2)[0].Trim();
        return string.IsNullOrEmpty(first) ? context.Connection.RemoteIpAddress?.ToString() ?? "unknown" : first;
    }
}
