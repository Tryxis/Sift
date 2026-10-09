namespace Sift.Api.Domain.Entities;

/// <summary>
/// The fact that a profile owns an app, plus Steam's playtime numbers.
/// Steam-owned: fully replaced on every sync. Never holds user-authored data.
/// </summary>
public class OwnedGame
{
    public string SteamId { get; set; } = string.Empty;
    public int AppId { get; set; }

    public int PlaytimeForeverMinutes { get; set; }
    public int PlaytimeTwoWeeksMinutes { get; set; }
    public DateTime? LastPlayedUtc { get; set; }
    public DateTime LastSyncedUtc { get; set; }

    public SteamProfile Profile { get; set; } = null!;
    public SteamApp App { get; set; } = null!;
}
