using Sift.Api.Domain.Enums;

namespace Sift.Api.Domain.Entities;

/// <summary>
/// Store-page details for one app, shared by every profile. Filled on demand by the details
/// endpoint and kept fresh by the enrichment job. An app with no store page still gets a row
/// (empty lists), so it isn't looked up again until the row is stale.
/// </summary>
public class SteamAppDetails
{
    public int AppId { get; set; }

    /// <summary>Steam's appdetails "type", e.g. "game", "demo", "dlc" or "music"; null when there's no store page.</summary>
    public string? StoreType { get; set; }

    public string[] Genres { get; set; } = [];
    public string[] Categories { get; set; } = [];
    public string[] Developers { get; set; } = [];
    public string[] Publishers { get; set; } = [];

    /// <summary>Steam's display string, e.g. "17 Sep, 2020" or "Coming soon".</summary>
    public string? ReleaseDate { get; set; }
    public int? ReleaseYear { get; set; }
    public bool ComingSoon { get; set; }

    public int? MetacriticScore { get; set; }
    public string? MetacriticUrl { get; set; }

    public SteamDeckCompatibility DeckCompatibility { get; set; }
    public bool IsMultiplayer { get; set; }
    public bool IsSingleplayer { get; set; }
    public string? ShortDescription { get; set; }

    public DateTime CheckedUtc { get; set; }

    public SteamApp App { get; set; } = null!;
}
