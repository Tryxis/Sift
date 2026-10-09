using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

public sealed class SteamPlayerSummary
{
    [JsonPropertyName("steamid")]
    public string SteamId { get; init; } = string.Empty;

    [JsonPropertyName("personaname")]
    public string PersonaName { get; init; } = string.Empty;

    [JsonPropertyName("profileurl")]
    public string? ProfileUrl { get; init; }

    [JsonPropertyName("avatarfull")]
    public string? AvatarFullUrl { get; init; }

    /// <summary>1 = private / friends only, 3 = public.</summary>
    [JsonPropertyName("communityvisibilitystate")]
    public int CommunityVisibilityState { get; init; }
}
