namespace Sift.Api.Domain.Entities;

/// <summary>
/// Game metadata shared across every profile that owns it. Future enrichment
/// (genres, tags, completion times, review scores) belongs here or in a table keyed by AppId.
/// </summary>
public class SteamApp
{
    public int AppId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconHash { get; set; }
    public DateTime LastUpdatedUtc { get; set; }
}
