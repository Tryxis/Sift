using Microsoft.AspNetCore.Mvc;

namespace Sift.Api.Infrastructure.Access;

/// <summary>
/// Blocks /api requests without a valid sign-in cookie when the password gate is enabled.
/// The frontend's static files stay public (they hold no data); the health check and the
/// sign-in endpoints stay open so the host and the login screen keep working.
/// </summary>
public sealed class AccessGateMiddleware(RequestDelegate next)
{
    private static readonly PathString[] OpenPaths = ["/api/health", "/api/access"];

    public async Task InvokeAsync(HttpContext context, AccessTokenService tokens)
    {
        var path = context.Request.Path;
        var isGated = tokens.IsEnabled &&
            path.StartsWithSegments("/api") &&
            !OpenPaths.Any(open => path.StartsWithSegments(open));

        if (isGated && !tokens.IsValid(context.Request.Cookies[AccessTokenService.CookieName]))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Sign in required",
                    Detail = "Enter the Sift password to continue.",
                },
                options: null,
                contentType: "application/problem+json");
            return;
        }

        await next(context);
    }
}
