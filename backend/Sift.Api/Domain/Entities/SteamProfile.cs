namespace Sift.Api.Domain.Entities;

/// <summary>
/// A Steam account we've synced at least once. Everything here is Steam-owned
/// and is overwritten on every sync.
/// </summary>
public class SteamProfile
{
    /// <summary>SteamID64, stored as a string so it survives JSON/JavaScript without precision loss.</summary>
    public string SteamId { get; set; } = string.Empty;

    public string PersonaName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? ProfileUrl { get; set; }

    /// <summary>False when Steam returned no game list (profile or game details are private).</summary>
    public bool IsLibraryVisible { get; set; }

    public DateTime LastSyncedUtc { get; set; }

    public ICollection<OwnedGame> OwnedGames { get; set; } = new List<OwnedGame>();
    public ICollection<BacklogEntry> BacklogEntries { get; set; } = new List<BacklogEntry>();
}
