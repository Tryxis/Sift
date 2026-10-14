using Sift.Api.Integrations.Steam.Store.Models;

namespace Sift.Api.Integrations.Steam.Store;

/// <summary>Public Steam Store endpoints. No API key; separate host from the Web API.</summary>
public interface ISteamStoreClient
{
    Task<SteamReviewQuerySummary?> GetReviewSummaryAsync(int appId, CancellationToken cancellationToken);

    /// <summary>Null when Steam has no store page for the app (success=false).</summary>
    Task<SteamAppDetails?> GetAppDetailsAsync(int appId, CancellationToken cancellationToken);

    /// <summary>Steam Deck compatibility: 3 = Verified, 2 = Playable, 1 = Unsupported, anything else unknown.</summary>
    Task<int?> GetDeckCompatibilityCategoryAsync(int appId, CancellationToken cancellationToken);
}
