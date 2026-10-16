namespace Sift.Api.Infrastructure.Security;

/// <summary>
/// Browser hardening headers on every response, static files included. Added as the response starts,
/// so they survive the exception handler clearing an error response.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    // Only Sift's own scripts run (the built app has no inline script). Styles allow inline because
    // React and Radix position menus and charts with style attributes. Images come from Steam's CDNs.
    // frame-ancestors 'none' stops the app being framed to trick clicks onto its buttons.
    public const string ContentSecurityPolicy =
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https://*.steamstatic.com https://media.steampowered.com https://steamcdn-a.akamaihd.net; " +
        "connect-src 'self'; " +
        "manifest-src 'self'; " +
        "worker-src 'self'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'";

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            var path = context.Request.Path;

            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers["Cross-Origin-Resource-Policy"] = "same-origin";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

            // Swagger UI (Development only) relies on inline scripts.
            if (!path.StartsWithSegments("/swagger"))
            {
                headers.ContentSecurityPolicy = ContentSecurityPolicy;
            }

            // API answers are per-user; keep them out of shared and browser HTTP caches. (The service
            // worker's offline copy is separate, and is cleared on sign-out.)
            if (path.StartsWithSegments("/api"))
            {
                headers.CacheControl = "no-store";
            }

            return Task.CompletedTask;
        });

        await next(context);
    }
}
