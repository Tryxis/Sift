using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Responses;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>Per-app data that isn't tied to any profile.</summary>
[ApiController]
[Route("api/apps/{appId:int}")]
[Produces("application/json")]
public sealed class AppsController(
    IAppDetailsService appDetailsService,
    ITimeToBeatLookupService timeToBeatLookupService) : ControllerBase
{
    /// <summary>Store-page details and Steam Deck rating. Always 200; missing data is empty or null.</summary>
    [HttpGet("details")]
    [ProducesResponseType<AppDetailsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AppDetailsResponse>> GetDetails(
        [FromRoute] int appId,
        CancellationToken cancellationToken) =>
        Ok(await appDetailsService.GetAsync(appId, cancellationToken));

    /// <summary>Completion times, from Sift's stored data or an on-demand HowLongToBeat search by the Steam name.</summary>
    [HttpGet("time-to-beat")]
    [ProducesResponseType<TimeToBeatResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TimeToBeatResponse>> GetTimeToBeat(
        [FromRoute] int appId,
        [FromQuery, Required, MaxLength(200)] string name,
        CancellationToken cancellationToken) =>
        Ok(await timeToBeatLookupService.GetAsync(appId, name.Trim(), cancellationToken));
}
