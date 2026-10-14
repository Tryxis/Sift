namespace Sift.Api.Domain.Entities;

/// <summary>
/// A game's lifetime playtime as of one UTC day. Written by sync only when the value differs
/// from the game's previous snapshot, so consecutive rows always show a change.
/// </summary>
public class PlaytimeSnapshot
{
    public string SteamId { get; set; } = string.Empty;
    public int AppId { get; set; }
    public DateOnly CapturedOn { get; set; }
    public int PlaytimeForeverMinutes { get; set; }

    public SteamProfile Profile { get; set; } = null!;
    public SteamApp App { get; set; } = null!;
}
