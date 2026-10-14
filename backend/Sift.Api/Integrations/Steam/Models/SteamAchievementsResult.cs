namespace Sift.Api.Integrations.Steam.Models;

public enum SteamAchievementsOutcome
{
    Available,
    NoAchievements,
    Private,
    Failed
}

/// <summary>A player's achievement progress for one app, already classified so callers never parse Steam errors.</summary>
public sealed record SteamAchievementsResult(SteamAchievementsOutcome Outcome, int Total, int Unlocked)
{
    public static SteamAchievementsResult Unavailable(SteamAchievementsOutcome outcome) => new(outcome, 0, 0);
}
