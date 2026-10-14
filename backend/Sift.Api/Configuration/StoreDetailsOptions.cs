using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Configuration;

/// <summary>
/// Background refresh of stored store-page details (genres, release year, Deck rating...).
/// Steam's appdetails endpoint allows roughly 200 calls per 5 minutes, so lookups are spaced out
/// and a 429 pauses the step before trying again.
/// </summary>
public sealed class StoreDetailsOptions
{
    public const string SectionName = "Enrichment:StoreDetails";

    public bool Enabled { get; init; } = true;

    /// <summary>Stored details older than this are refreshed (and re-fetched on demand).</summary>
    [Range(1, 365)]
    public int RefreshAfterDays { get; init; } = 30;

    [Range(250, 60000)]
    public int RequestDelayMilliseconds { get; init; } = 1500;

    [Range(1, 5000)]
    public int MaxAppsPerRun { get; init; } = 300;

    /// <summary>How long to wait after Steam answers 429 before carrying on.</summary>
    [Range(5, 900)]
    public int RateLimitBackoffSeconds { get; init; } = 120;

    /// <summary>After this many 429s in one run, the step stops until the next run.</summary>
    [Range(1, 10)]
    public int MaxRateLimitBackoffsPerRun { get; init; } = 3;
}
