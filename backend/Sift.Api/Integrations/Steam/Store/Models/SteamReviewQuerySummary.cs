using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Store.Models;

public sealed class SteamReviewQuerySummary
{
    [JsonPropertyName("total_positive")]
    public int TotalPositive { get; init; }

    [JsonPropertyName("total_negative")]
    public int TotalNegative { get; init; }

    [JsonPropertyName("review_score_desc")]
    public string? ReviewScoreDescription { get; init; }
}
