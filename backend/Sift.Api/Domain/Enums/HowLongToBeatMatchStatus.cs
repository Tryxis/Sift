namespace Sift.Api.Domain.Enums;

public enum HowLongToBeatMatchStatus
{
    /// <summary>A HowLongToBeat entry was confidently matched to the Steam app.</summary>
    Matched = 0,

    /// <summary>HowLongToBeat was searched but nothing matched closely enough.</summary>
    NotFound = 1
}
