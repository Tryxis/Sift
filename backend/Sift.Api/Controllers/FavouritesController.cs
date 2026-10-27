using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>
/// The profiles someone keeps track of, and their public notes. A favourites list is personal,
/// so every endpoint, reads included, is for the profile's owner only.
/// </summary>
[ApiController]
[Authorize(Policy = ProfileOwnerRequirement.PolicyName)]
[Route("api/profiles/{steamId}/favourites")]
[Produces("application/json")]
public sealed class FavouritesController(IFavouriteProfileService favouriteService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<FavouriteProfileResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<FavouriteProfileResponse>>> Get(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await favouriteService.GetAsync(steamId, cancellationToken));

    /// <summary>Adds a favourite, or changes its alias.</summary>
    [HttpPut("{favouriteSteamId}")]
    [ProducesResponseType<FavouriteProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FavouriteProfileResponse>> Save(
        [FromRoute] string steamId,
        [FromRoute] string favouriteSteamId,
        [FromBody] SaveFavouriteRequest request,
        CancellationToken cancellationToken) =>
        Ok(await favouriteService.SaveAsync(steamId, favouriteSteamId, request.Alias, cancellationToken));

    [HttpDelete("{favouriteSteamId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(
        [FromRoute] string steamId,
        [FromRoute] string favouriteSteamId,
        CancellationToken cancellationToken)
    {
        await favouriteService.DeleteAsync(steamId, favouriteSteamId, cancellationToken);
        return NoContent();
    }

    /// <summary>Public notes favourites have written on one game.</summary>
    [HttpGet("notes/{appId:int}")]
    [ProducesResponseType<IReadOnlyList<FavouriteNoteResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<FavouriteNoteResponse>>> GetNotes(
        [FromRoute] string steamId,
        [FromRoute] int appId,
        CancellationToken cancellationToken) =>
        Ok(await favouriteService.GetNotesAsync(steamId, appId, cancellationToken));
}
