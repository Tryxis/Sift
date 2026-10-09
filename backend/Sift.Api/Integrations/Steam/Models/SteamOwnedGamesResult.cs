using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

/// <summary>
/// Steam returns an empty object (no game_count, no games) when a profile's
/// game details are private, so both properties are nullable on purpose.
/// </summary>
public sealed class SteamOwnedGamesResult
{
    [JsonPropertyName("game_count")]
    public int? GameCount { get; init; }

    [JsonPropertyName("games")]
    public List<SteamOwnedGame>? Games { get; init; }
}
