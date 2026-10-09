using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.HowLongToBeat.Models;

public sealed class HowLongToBeatSearchResponse
{
    [JsonPropertyName("data")]
    public List<HowLongToBeatGame> Data { get; init; } = [];
}
