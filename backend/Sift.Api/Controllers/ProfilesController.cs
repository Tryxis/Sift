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
    ILibraryQueryService libraryQueryService) : ControllerBase
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
}
