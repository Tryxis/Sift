using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

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
    [ProducesResponseType<LibraryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<LibraryResponse>> Sync(
        [FromBody] SyncProfileRequest request,
        CancellationToken cancellationToken) =>
        Ok(await librarySyncService.SyncAsync(request.Identifier, cancellationToken));

    /// <summary>Read a previously synced library without calling Steam.</summary>
    [HttpGet("{steamId}/library")]
    [ProducesResponseType<LibraryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LibraryResponse>> GetLibrary(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await libraryQueryService.GetLibraryAsync(steamId, cancellationToken));

    [HttpGet("{steamId}/saved-views")]
    [ProducesResponseType<IReadOnlyList<SavedFilterViewResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SavedFilterViewResponse>>> GetSavedViews(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await savedFilterViewService.GetAsync(steamId, cancellationToken));

    [HttpPost("{steamId}/saved-views")]
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
    [ProducesResponseType<IReadOnlyList<SavedFilterViewResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SavedFilterViewResponse>>> SelectSavedView(
        [FromRoute] string steamId,
        [FromBody] SelectFilterViewRequest request,
        CancellationToken cancellationToken) =>
        Ok(await savedFilterViewService.SelectAsync(steamId, request.Id, cancellationToken));

    [HttpDelete("{steamId}/saved-views/{id:guid}")]
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
