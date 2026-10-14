using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Infrastructure.Access;

namespace Sift.Api.Controllers;

/// <summary>Sign-in for the temporary shared-password gate (see AccessOptions).</summary>
[ApiController]
[Route("api/access")]
[Produces("application/json")]
public sealed class AccessController(AccessTokenService tokens) : ControllerBase
{
    public const string SignInRateLimitPolicy = "access-sign-in";

    [HttpGet]
    [ProducesResponseType<AccessStatusResponse>(StatusCodes.Status200OK)]
    public ActionResult<AccessStatusResponse> GetStatus() =>
        Ok(new AccessStatusResponse(
            tokens.IsEnabled,
            !tokens.IsEnabled || tokens.IsValid(Request.Cookies[AccessTokenService.CookieName])));

    [HttpPost("sign-in")]
    [EnableRateLimiting(SignInRateLimitPolicy)]
    [ProducesResponseType<AccessStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AccessStatusResponse>> SignIn(
        [FromBody] AccessSignInRequest request,
        CancellationToken cancellationToken)
    {
        if (!tokens.IsEnabled)
        {
            return Ok(new AccessStatusResponse(false, true));
        }

        if (!tokens.PasswordMatches(request.Password))
        {
            // A short pause makes guessing slower on top of the rate limit.
            await Task.Delay(TimeSpan.FromMilliseconds(600), cancellationToken);
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Wrong password");
        }

        var (value, expires) = tokens.CreateToken();
        Response.Cookies.Append(AccessTokenService.CookieName, value, CookieOptions(expires));
        return Ok(new AccessStatusResponse(true, true));
    }

    [HttpPost("sign-out")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult EndSession()
    {
        Response.Cookies.Delete(AccessTokenService.CookieName, CookieOptions(expires: null));
        return NoContent();
    }

    private CookieOptions CookieOptions(DateTimeOffset? expires) => new()
    {
        HttpOnly = true,
        // Hosts such as Render terminate HTTPS at a proxy and forward plain HTTP.
        Secure = Request.IsHttps ||
            string.Equals(Request.Headers["X-Forwarded-Proto"], "https", StringComparison.OrdinalIgnoreCase),
        SameSite = SameSiteMode.Strict,
        Path = "/",
        Expires = expires,
    };
}
