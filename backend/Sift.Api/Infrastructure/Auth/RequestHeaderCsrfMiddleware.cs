using Microsoft.AspNetCore.Mvc;

namespace Sift.Api.Infrastructure.Auth;

/// <summary>
/// Defence in depth against cross-site request forgery, on top of the SameSite=Lax session cookie:
/// state-changing /api requests must carry a custom header. Another site can't add one without a
/// CORS preflight, and Sift grants no cross-origin access, so a forged request never gets this far.
/// </summary>
public sealed class RequestHeaderCsrfMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Sift-Request";

    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        var isUnsafe = !(HttpMethods.IsGet(request.Method) ||
                         HttpMethods.IsHead(request.Method) ||
                         HttpMethods.IsOptions(request.Method));

        if (isUnsafe && request.Path.StartsWithSegments("/api") && !request.Headers.ContainsKey(HeaderName))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Request rejected",
                    Detail = $"State-changing requests must include the {HeaderName} header.",
                },
                options: null,
                contentType: "application/problem+json");
            return;
        }

        await next(context);
    }
}
