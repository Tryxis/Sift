using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

public sealed class SteamResolveVanityUrlResult
{
    /// <summary>1 = match found, 42 = no match.</summary>
    [JsonPropertyName("success")]
    public int Success { get; init; }

    [JsonPropertyName("steamid")]
    public string? SteamId { get; init; }

    [JsonPropertyName("message")]
    public string? Message { get; init; }
}
