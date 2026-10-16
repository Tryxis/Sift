using AspNet.Security.OpenId.Steam;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Responses;
using Sift.Api.Infrastructure.Auth;

namespace Sift.Api.Controllers;

/// <summary>
/// Sign in with Steam. Steam checks the password (and Steam Guard) on its own site and Sift verifies
/// the answer with Steam server-side, so Sift never handles a credential.
/// </summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController(DbTicketStore sessions) : ControllerBase
{
    /// <summary>Who this browser is signed in as. Always 200, so the app can check without an error.</summary>
    [HttpGet("session")]
    [AllowAnonymous]
    [Produces("application/json")]
    [ProducesResponseType<SessionResponse>(StatusCodes.Status200OK)]
    public ActionResult<SessionResponse> GetSession()
    {
        var steamId = User.GetSteamId();
        return Ok(new SessionResponse(steamId is not null, steamId));
    }

    /// <summary>Starts the Steam sign-in by redirecting to steamcommunity.com.</summary>
    /// <param name="returnUrl">A path within Sift to come back to; anything else is ignored.</param>
    [HttpGet("steam/sign-in")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public IActionResult SignIn([FromQuery] string? returnUrl = null) =>
        Challenge(
            new AuthenticationProperties { RedirectUri = IsSafeReturnUrl(returnUrl) ? returnUrl : "/" },
            SteamAuthenticationDefaults.AuthenticationScheme);

    /// <summary>Ends this browser's session, server-side: its cookie stops working even if copied.</summary>
    [HttpPost("sign-out")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EndSession()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    /// <summary>Ends every session this Steam account has, on every device, this one included.</summary>
    // Not [AllowAnonymous]: a class-level AllowAnonymous would override an action's [Authorize].
    [HttpPost("sign-out-everywhere")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> EndAllSessions(CancellationToken cancellationToken)
    {
        await sessions.RemoveAllAsync(User.GetSteamId()!, cancellationToken);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    // Local paths only ("/x", not "//evil.example" or "/\evil.example"), so sign-in can't be used
    // as an open redirect; and never back into the sign-in flow itself.
    private bool IsSafeReturnUrl(string? returnUrl) =>
        !string.IsNullOrEmpty(returnUrl) &&
        Url.IsLocalUrl(returnUrl) &&
        !returnUrl.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase);
}
