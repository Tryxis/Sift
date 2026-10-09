using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Store.Models;

public sealed class SteamAppReviewsResponse
{
    [JsonPropertyName("success")]
    public int Success { get; init; }

    [JsonPropertyName("query_summary")]
    public SteamReviewQuerySummary? QuerySummary { get; init; }
}
