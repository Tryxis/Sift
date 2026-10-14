using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

/// <summary>
/// ISteamUserStats/GetPlayerAchievements wraps its payload in "playerstats", not "response".
/// On failure Steam sets success=false and puts a human-readable reason in "error".
/// </summary>
public sealed class SteamPlayerStatsEnvelope
{
    [JsonPropertyName("playerstats")]
    public SteamPlayerStats? PlayerStats { get; init; }
}

public sealed class SteamPlayerStats
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("error")]
    public string? Error { get; init; }

    [JsonPropertyName("achievements")]
    public List<SteamPlayerAchievement>? Achievements { get; init; }
}

public sealed class SteamPlayerAchievement
{
    [JsonPropertyName("apiname")]
    public string? ApiName { get; init; }

    /// <summary>1 = unlocked, 0 = locked.</summary>
    [JsonPropertyName("achieved")]
    public int Achieved { get; init; }
}
