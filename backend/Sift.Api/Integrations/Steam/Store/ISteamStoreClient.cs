using Sift.Api.Integrations.Steam.Store.Models;

namespace Sift.Api.Integrations.Steam.Store;

/// <summary>Public Steam Store endpoints. No API key; separate host from the Web API.</summary>
public interface ISteamStoreClient
{
    Task<SteamReviewQuerySummary?> GetReviewSummaryAsync(int appId, CancellationToken cancellationToken);
}
