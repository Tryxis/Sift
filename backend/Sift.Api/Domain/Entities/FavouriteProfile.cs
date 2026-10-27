namespace Sift.Api.Domain.Entities;

/// <summary>
/// A profile someone has starred to keep track of, with an optional alias ("Sam from work").
/// Owned by OwnerSteamId; only they see or change it. Their public notes show up in the owner's
/// game details.
/// </summary>
public sealed class FavouriteProfile
{
    public const int AliasMaxLength = 40;
    public const int MaxPerOwner = 50;

    public string OwnerSteamId { get; set; } = string.Empty;
    public string SteamId { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public DateTime AddedUtc { get; set; }

    public SteamProfile Owner { get; set; } = null!;
    public SteamProfile Profile { get; set; } = null!;
}
