using Sift.Api.Domain.Enums;

namespace Sift.Api.Domain.Entities;

/// <summary>
/// User-authored organisation for one game in one profile's library.
/// Keyed by the owning SteamID, so the config always belongs to that account.
/// Sync never reads or writes this table; a missing row means "Backlog, no notes".
/// </summary>
public class BacklogEntry
{
    public const int NotesMaxLength = 2000;

    public string SteamId { get; set; } = string.Empty;
    public int AppId { get; set; }

    public BacklogStatus Status { get; set; } = BacklogStatus.Backlog;
    public int? Priority { get; set; }
    public string? Notes { get; set; }
    public bool PlayedBefore { get; set; }
    public decimal? FinishedHours { get; set; }
    public DateTime UpdatedUtc { get; set; }

    public SteamProfile Profile { get; set; } = null!;
    public SteamApp App { get; set; } = null!;
}
