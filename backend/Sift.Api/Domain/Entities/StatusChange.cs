using Sift.Api.Domain.Enums;

namespace Sift.Api.Domain.Entities;

/// <summary>One backlog status change, recorded by the backlog PATCH. Append-only.</summary>
public class StatusChange
{
    public long Id { get; set; }
    public string SteamId { get; set; } = string.Empty;
    public int AppId { get; set; }

    /// <summary>Null when the entry was first created with a non-default status.</summary>
    public BacklogStatus? FromStatus { get; set; }
    public BacklogStatus ToStatus { get; set; }
    public DateTime ChangedUtc { get; set; }

    public SteamProfile Profile { get; set; } = null!;
    public SteamApp App { get; set; } = null!;
}
