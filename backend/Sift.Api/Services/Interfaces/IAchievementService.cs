using Sift.Api.Contracts.Responses;
using Sift.Api.Integrations.Steam.Models;

namespace Sift.Api.Services.Interfaces;

public interface IAchievementService
{
    /// <summary>Never fails on Steam errors: Available=false with a Reason instead.</summary>
    Task<AchievementSummaryResponse> GetAsync(string steamId, int appId, CancellationToken cancellationToken);

    /// <summary>Fetches from Steam now and stores the result, for the enrichment job.</summary>
    Task<SteamAchievementsOutcome> RefreshStoredAsync(string steamId, int appId, CancellationToken cancellationToken);
}
