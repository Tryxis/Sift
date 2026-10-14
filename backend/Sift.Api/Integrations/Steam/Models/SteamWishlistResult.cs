using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

/// <summary>Steam returns an empty object when a wishlist is private or empty, so Items is nullable.</summary>
public sealed class SteamWishlistResult
{
    [JsonPropertyName("items")]
    public List<SteamWishlistItem>? Items { get; init; }
}

public sealed class SteamWishlistItem
{
    [JsonPropertyName("appid")]
    public int AppId { get; init; }

    /// <summary>1 is the top of the list; 0 means the user hasn't ranked it.</summary>
    [JsonPropertyName("priority")]
    public int Priority { get; init; }

    /// <summary>Unix seconds; 0 when unknown.</summary>
    [JsonPropertyName("date_added")]
    public long DateAddedUnixSeconds { get; init; }
}
