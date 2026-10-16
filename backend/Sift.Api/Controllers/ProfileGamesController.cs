using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sift.Api.Contracts.Responses;
using Sift.Api.Extensions;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>Live, per-profile data read straight from Steam. Neither endpoint needs the profile to be synced.</summary>
[ApiController]
// Read-only: open to guests too (see ViewerRequirement).
[Authorize(Policy = ViewerRequirement.PolicyName)]
[Route("api/profiles/{steamId}")]
[Produces("application/json")]
public sealed class ProfileGamesController(
    IAchievementService achievementService,
    IWishlistService wishlistService) : ControllerBase
{
    /// <summary>Achievement progress. Always 200 for a valid SteamID64; Available=false explains itself in Reason.</summary>
    [HttpGet("games/{appId:int}/achievements")]
    [EnableRateLimiting(AuthServiceCollectionExtensions.SteamLookupRateLimitPolicy)]
    [ProducesResponseType<AchievementSummaryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AchievementSummaryResponse>> GetAchievements(
        [FromRoute] string steamId,
        [FromRoute] int appId,
        CancellationToken cancellationToken) =>
        Ok(await achievementService.GetAsync(steamId, appId, cancellationToken));

    /// <summary>The wishlist in Steam's priority order. Private or empty wishlists return [].</summary>
    [HttpGet("wishlist")]
    [EnableRateLimiting(AuthServiceCollectionExtensions.SteamLookupRateLimitPolicy)]
    [ProducesResponseType<IReadOnlyList<WishlistItemResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<IReadOnlyList<WishlistItemResponse>>> GetWishlist(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await wishlistService.GetAsync(steamId, cancellationToken));
}
