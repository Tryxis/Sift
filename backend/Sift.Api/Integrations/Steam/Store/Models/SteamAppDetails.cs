using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Store.Models;

/// <summary>One entry of store/api/appdetails, which is keyed by the app id as a string.</summary>
public sealed class SteamAppDetailsEnvelope
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("data")]
    public SteamAppDetails? Data { get; init; }
}

public sealed class SteamAppDetails
{
    [JsonPropertyName("short_description")]
    public string? ShortDescription { get; init; }

    [JsonPropertyName("genres")]
    public List<SteamAppDescriptor>? Genres { get; init; }

    [JsonPropertyName("categories")]
    public List<SteamAppDescriptor>? Categories { get; init; }

    [JsonPropertyName("developers")]
    public List<string>? Developers { get; init; }

    [JsonPropertyName("publishers")]
    public List<string>? Publishers { get; init; }

    [JsonPropertyName("release_date")]
    public SteamAppReleaseDate? ReleaseDate { get; init; }

    [JsonPropertyName("metacritic")]
    public SteamAppMetacritic? Metacritic { get; init; }
}

/// <summary>Genres and categories share this shape; genre ids are strings and category ids numbers, so the id is ignored.</summary>
public sealed class SteamAppDescriptor
{
    [JsonPropertyName("description")]
    public string? Description { get; init; }
}

public sealed class SteamAppReleaseDate
{
    [JsonPropertyName("coming_soon")]
    public bool ComingSoon { get; init; }

    /// <summary>Steam's display string, e.g. "17 Sep, 2020" or "Coming soon".</summary>
    [JsonPropertyName("date")]
    public string? Date { get; init; }
}

public sealed class SteamAppMetacritic
{
    [JsonPropertyName("score")]
    public int? Score { get; init; }

    [JsonPropertyName("url")]
    public string? Url { get; init; }
}
