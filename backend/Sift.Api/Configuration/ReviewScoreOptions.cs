using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Configuration;

public sealed class ReviewScoreOptions
{
    public const string SectionName = "Enrichment:ReviewScores";

    public bool Enabled { get; init; } = true;

    [Required, Url]
    public string StoreBaseUrl { get; init; } = "https://store.steampowered.com/";

    [Range(1, 365)]
    public int RefreshAfterDays { get; init; } = 7;

    [Range(250, 60000)]
    public int RequestDelayMilliseconds { get; init; } = 1500;
}
