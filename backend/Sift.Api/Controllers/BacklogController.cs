using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>Changes to a library's backlog. Only the library's owner, signed in with Steam, may make them.</summary>
[ApiController]
[Authorize(Policy = ProfileOwnerRequirement.PolicyName)]
[Route("api/profiles/{steamId}/games/{appId:int}/backlog")]
[Produces("application/json")]
public sealed class BacklogController(IBacklogService backlogService) : ControllerBase
{
    [HttpPatch]
    [ProducesResponseType<LibraryGameResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LibraryGameResponse>> Update(
        [FromRoute] string steamId,
        [FromRoute] int appId,
        [FromBody] UpdateBacklogEntryRequest request,
        CancellationToken cancellationToken) =>
        Ok(await backlogService.UpdateEntryAsync(steamId, appId, request, cancellationToken));
}
