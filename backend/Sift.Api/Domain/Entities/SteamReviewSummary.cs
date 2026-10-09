namespace Sift.Api.Domain.Entities;

/// <summary>Steam user-review totals for one app, plus the SteamDB-style rating derived from them.</summary>
public class SteamReviewSummary
{
    public int AppId { get; set; }

    public int TotalPositive { get; set; }
    public int TotalNegative { get; set; }

    /// <summary>0–100, or null when the app has no reviews.</summary>
    public double? Rating { get; set; }

    public DateTime LastCheckedUtc { get; set; }

    public SteamApp App { get; set; } = null!;
}
