using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Contracts.Requests;

public sealed record SyncProfileRequest
{
    /// <summary>A SteamID64, a custom profile name, or a full steamcommunity.com profile URL.</summary>
    [Required(AllowEmptyStrings = false)]
    [MaxLength(256)]
    public string Identifier { get; init; } = string.Empty;
}
