using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Extensions;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>
/// Anyone signed in, and guests while guest browsing is on, can sync and read any public profile
/// (the Viewer policy). Saved views are changed only by the profile's owner (ProfileOwner).
/// </summary>
[ApiController]
[Route("api/profiles")]
[Produces("application/json")]
public sealed class ProfilesController(
    ILibrarySyncService librarySyncService,
    ILibraryQueryService libraryQueryService,
    ISavedFilterViewService savedFilterViewService) : ControllerBase
{
    /// <summary>Look up any public Steam profile and pull its live library.</summary>
    [HttpPost("sync")]
    [Authorize(Policy = ViewerRequirement.PolicyName)]
    [EnableRateLimiting(AuthServiceCollectionExtensions.SyncRateLimitPolicy)]
    [ProducesResponseType<LibraryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<LibraryResponse>> Sync(
        [FromBody] SyncProfileRequest request,
        CancellationToken cancellationToken) =>
        Ok(await librarySyncService.SyncAsync(request.Identifier, User.GetSteamId(), cancellationToken));

    /// <summary>Read a previously synced library without calling Steam. Private notes are left out unless it's yours.</summary>
    [HttpGet("{steamId}/library")]
    [Authorize(Policy = ViewerRequirement.PolicyName)]
    [ProducesResponseType<LibraryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LibraryResponse>> GetLibrary(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await libraryQueryService.GetLibraryAsync(steamId, User.GetSteamId(), cancellationToken));

    [HttpGet("{steamId}/saved-views")]
    [Authorize(Policy = ViewerRequirement.PolicyName)]
    [ProducesResponseType<IReadOnlyList<SavedFilterViewResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SavedFilterViewResponse>>> GetSavedViews(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await savedFilterViewService.GetAsync(steamId, cancellationToken));

    [HttpPost("{steamId}/saved-views")]
    [Authorize(Policy = ProfileOwnerRequirement.PolicyName)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<SavedFilterViewResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SavedFilterViewResponse>> CreateSavedView(
        [FromRoute] string steamId,
        [FromBody] SaveFilterViewRequest request,
        CancellationToken cancellationToken)
    {
        var created = await savedFilterViewService.CreateAsync(steamId, request, cancellationToken);
        return CreatedAtAction(nameof(GetSavedViews), new { steamId }, created);
    }

    [HttpPut("{steamId}/saved-views/{id:guid}")]
    [Authorize(Policy = ProfileOwnerRequirement.PolicyName)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<SavedFilterViewResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SavedFilterViewResponse>> UpdateSavedView(
        [FromRoute] string steamId,
        [FromRoute] Guid id,
        [FromBody] SaveFilterViewRequest request,
        CancellationToken cancellationToken) =>
        Ok(await savedFilterViewService.UpdateAsync(steamId, id, request, cancellationToken));

    [HttpPut("{steamId}/saved-views/selection")]
    [Authorize(Policy = ProfileOwnerRequirement.PolicyName)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<IReadOnlyList<SavedFilterViewResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SavedFilterViewResponse>>> SelectSavedView(
        [FromRoute] string steamId,
        [FromBody] SelectFilterViewRequest request,
        CancellationToken cancellationToken) =>
        Ok(await savedFilterViewService.SelectAsync(steamId, request.Id, cancellationToken));

    [HttpDelete("{steamId}/saved-views/{id:guid}")]
    [Authorize(Policy = ProfileOwnerRequirement.PolicyName)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSavedView(
        [FromRoute] string steamId,
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await savedFilterViewService.DeleteAsync(steamId, id, cancellationToken);
        return NoContent();
    }
}
