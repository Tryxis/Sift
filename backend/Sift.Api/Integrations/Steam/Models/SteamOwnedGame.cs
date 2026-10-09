using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

public sealed class SteamOwnedGame
{
    [JsonPropertyName("appid")]
    public int AppId { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("img_icon_url")]
    public string? IconHash { get; init; }

    [JsonPropertyName("playtime_forever")]
    public int PlaytimeForeverMinutes { get; init; }

    [JsonPropertyName("playtime_2weeks")]
    public int PlaytimeTwoWeeksMinutes { get; init; }

    /// <summary>Unix seconds; 0 when never played.</summary>
    [JsonPropertyName("rtime_last_played")]
    public long LastPlayedUnixSeconds { get; init; }
}
