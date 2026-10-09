using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Configuration;

public sealed class HowLongToBeatOptions
{
    public const string SectionName = "Enrichment:HowLongToBeat";

    public bool Enabled { get; init; } = true;

    [Required, Url]
    public string BaseUrl { get; init; } = "https://howlongtobeat.com/";

    /// <summary>HowLongToBeat rejects requests that don't look like a browser.</summary>
    [Required]
    public string UserAgent { get; init; } =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

    /// <summary>Completion times rarely change, so each game is re-checked at most this often.</summary>
    [Range(1, 365)]
    public int RefreshAfterDays { get; init; } = 30;

    /// <summary>Pause between searches, to stay well below anything that looks like load.</summary>
    [Range(500, 60000)]
    public int RequestDelayMilliseconds { get; init; } = 2500;
}
