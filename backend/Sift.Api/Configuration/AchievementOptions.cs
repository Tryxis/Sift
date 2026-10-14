using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Configuration;

/// <summary>Background refresh of stored achievement progress for each synced profile's played games.</summary>
public sealed class AchievementOptions
{
    public const string SectionName = "Enrichment:Achievements";

    public bool Enabled { get; init; } = true;

    /// <summary>A stored row is refreshed once it's this old and the game has been played since.</summary>
    [Range(1, 365)]
    public int RefreshAfterDays { get; init; } = 7;

    /// <summary>Games found to have no achievements are re-checked this rarely.</summary>
    [Range(1, 3650)]
    public int UnavailableRefreshAfterDays { get; init; } = 90;

    [Range(100, 60000)]
    public int RequestDelayMilliseconds { get; init; } = 1000;

    /// <summary>Total Steam calls per run, across all profiles.</summary>
    [Range(1, 10000)]
    public int MaxCallsPerRun { get; init; } = 500;
}
