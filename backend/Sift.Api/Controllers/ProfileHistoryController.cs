using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Sift.Api.Contracts.Responses;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Controllers;

/// <summary>History Sift has recorded for a synced profile: status changes and playtime over time.</summary>
[ApiController]
[Route("api/profiles/{steamId}")]
[Produces("application/json")]
public sealed class ProfileHistoryController(IProfileHistoryService profileHistoryService) : ControllerBase
{
    private const int MaxStatusChanges = 5000;

    /// <summary>Backlog status changes, newest first (at most 5000).</summary>
    [HttpGet("history")]
    [ProducesResponseType<IReadOnlyList<StatusChangeResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<StatusChangeResponse>>> GetHistory(
        [FromRoute] string steamId,
        CancellationToken cancellationToken) =>
        Ok(await profileHistoryService.GetStatusHistoryAsync(steamId, MaxStatusChanges, cancellationToken));

    /// <summary>Playtime gained per calendar month (UTC), oldest first, including months with none.</summary>
    [HttpGet("playtime/monthly")]
    [ProducesResponseType<IReadOnlyList<MonthlyPlaytimeResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<MonthlyPlaytimeResponse>>> GetMonthlyPlaytime(
        [FromRoute] string steamId,
        [FromQuery, Range(1, 120)] int months = 24,
        CancellationToken cancellationToken = default) =>
        Ok(await profileHistoryService.GetMonthlyPlaytimeAsync(steamId, months, cancellationToken));
}
