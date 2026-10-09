using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Configuration;

/// <summary>Schedule for the background job that adds completion times and review scores.</summary>
public sealed class EnrichmentOptions
{
    public const string SectionName = "Enrichment";

    public bool Enabled { get; init; } = true;

    [Range(1, 168)]
    public int RunIntervalHours { get; init; } = 24;

    /// <summary>Lets the app finish starting before the first run.</summary>
    [Range(0, 3600)]
    public int StartupDelaySeconds { get; init; } = 30;

    /// <summary>Caps each source per run, so a huge library is spread over several days.</summary>
    [Range(1, 5000)]
    public int MaxAppsPerRun { get; init; } = 250;
}
