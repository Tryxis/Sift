using System.Globalization;
using System.Text.Json;
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

    public async Task<SteamAppDetails?> GetAppDetailsAsync(int appId, CancellationToken cancellationToken)
    {
        var response = await httpClient.GetFromJsonAsync<Dictionary<string, SteamAppDetailsEnvelope>>(
            $"api/appdetails?appids={appId}&l=english",
            cancellationToken);

        return response is not null
               && response.TryGetValue(appId.ToString(CultureInfo.InvariantCulture), out var entry)
               && entry.Success
            ? entry.Data
            : null;
    }

    public async Task<int?> GetDeckCompatibilityCategoryAsync(int appId, CancellationToken cancellationToken)
    {
        // "results" is an object for known apps but can be an empty array or missing otherwise,
        // so this is read loosely rather than through a typed model.
        await using var stream = await httpClient.GetStreamAsync(
            $"saleaction/ajaxgetdeckappcompatibilityreport?nAppID={appId}&l=english",
            cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        return document.RootElement.ValueKind == JsonValueKind.Object
               && document.RootElement.TryGetProperty("results", out var results)
               && results.ValueKind == JsonValueKind.Object
               && results.TryGetProperty("resolved_category", out var category)
               && category.TryGetInt32(out var value)
            ? value
            : null;
    }
}
