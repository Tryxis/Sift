using Sift.Api.Integrations.Steam.Store.Models;

namespace Sift.Api.Integrations.Steam.Store;

public sealed class SteamStoreClient(HttpClient httpClient) : ISteamStoreClient
{
    public async Task<SteamReviewQuerySummary?> GetReviewSummaryAsync(int appId, CancellationToken cancellationToken)
    {
        // purchase_type=all matches SteamDB, which counts reviews from every purchase type.
        var response = await httpClient.GetFromJsonAsync<SteamAppReviewsResponse>(
            $"appreviews/{appId}?json=1&language=all&purchase_type=all&filter=all&num_per_page=0",
            cancellationToken);

        return response?.Success == 1 ? response.QuerySummary : null;
    }
}
