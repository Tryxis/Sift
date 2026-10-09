using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

public sealed class SteamPlayerSummariesResult
{
    [JsonPropertyName("players")]
    public List<SteamPlayerSummary> Players { get; init; } = [];
}
