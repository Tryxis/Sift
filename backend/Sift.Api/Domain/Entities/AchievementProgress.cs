namespace Sift.Api.Domain.Entities;

/// <summary>
/// A player's achievement totals for one owned game. Available=false means the game has
/// no achievements, so it's only re-checked occasionally.
/// </summary>
public class AchievementProgress
{
    public string SteamId { get; set; } = string.Empty;
    public int AppId { get; set; }

    public bool Available { get; set; }
    public int Total { get; set; }
    public int Unlocked { get; set; }
    public DateTime CheckedUtc { get; set; }

    public SteamProfile Profile { get; set; } = null!;
    public SteamApp App { get; set; } = null!;
}
