using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.HowLongToBeat.Models;

/// <summary>One search result. Times are in seconds; 0 means no data.</summary>
public sealed class HowLongToBeatGame
{
    [JsonPropertyName("game_id")]
    public int GameId { get; init; }

    [JsonPropertyName("game_name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("game_alias")]
    public string? Alias { get; init; }

    [JsonPropertyName("comp_main")]
    public int MainSeconds { get; init; }

    [JsonPropertyName("comp_plus")]
    public int MainExtrasSeconds { get; init; }

    [JsonPropertyName("comp_100")]
    public int CompletionistSeconds { get; init; }
}
