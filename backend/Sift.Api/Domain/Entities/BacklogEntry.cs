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

    /// <summary>When true, Notes are shown only to the owner; everyone else gets none. Public by default.</summary>
    public bool NotesPrivate { get; set; }
    public bool PlayedBefore { get; set; }
    public decimal? FinishedHours { get; set; }
    public bool NotInterested { get; set; }
    public DateTime UpdatedUtc { get; set; }

    /// <summary>When Status last changed through the API; null for entries untouched since history began.</summary>
    public DateTime? StatusChangedUtc { get; set; }

    public SteamProfile Profile { get; set; } = null!;
    public SteamApp App { get; set; } = null!;
}
