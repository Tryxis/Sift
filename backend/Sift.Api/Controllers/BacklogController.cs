using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>
/// Prototype: open to anyone. Steam sign-in will add
/// [Authorize(Policy = "LibraryOwner")] here, requiring the signed-in SteamID to match {steamId}.
/// </summary>
[ApiController]
[Route("api/profiles/{steamId}/games/{appId:int}/backlog")]
[Produces("application/json")]
public sealed class BacklogController(IBacklogService backlogService) : ControllerBase
{
    [HttpPatch]
    [ProducesResponseType<LibraryGameResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LibraryGameResponse>> Update(
        [FromRoute] string steamId,
        [FromRoute] int appId,
        [FromBody] UpdateBacklogEntryRequest request,
        CancellationToken cancellationToken) =>
        Ok(await backlogService.UpdateEntryAsync(steamId, appId, request, cancellationToken));
}
