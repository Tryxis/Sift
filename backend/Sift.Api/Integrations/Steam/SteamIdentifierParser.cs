using System.Text.RegularExpressions;

namespace Sift.Api.Integrations.Steam;

/// <summary>
/// Pure parsing of user input: SteamID64, vanity name, or a pasted profile URL.
/// No I/O, so it's trivially unit-testable.
/// </summary>
public static partial class SteamIdentifierParser
{
    [GeneratedRegex(@"^7656119\d{10}$")]
    private static partial Regex SteamId64Pattern();

    [GeneratedRegex(@"steamcommunity\.com/profiles/(7656119\d{10})", RegexOptions.IgnoreCase)]
    private static partial Regex ProfilesUrlPattern();

    [GeneratedRegex(@"steamcommunity\.com/id/([A-Za-z0-9_-]{2,32})", RegexOptions.IgnoreCase)]
    private static partial Regex VanityUrlPattern();

    [GeneratedRegex(@"^[A-Za-z0-9_-]{2,32}$")]
    private static partial Regex VanityNamePattern();

    public static bool IsSteamId64(string? value) =>
        value is not null && SteamId64Pattern().IsMatch(value);

    public static SteamIdentifier? TryParse(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }

        var trimmed = input.Trim().TrimEnd('/');

        if (IsSteamId64(trimmed))
        {
            return new SteamIdentifier(SteamIdentifierKind.SteamId64, trimmed);
        }

        var profilesMatch = ProfilesUrlPattern().Match(trimmed);
        if (profilesMatch.Success)
        {
            return new SteamIdentifier(SteamIdentifierKind.SteamId64, profilesMatch.Groups[1].Value);
        }

        var vanityUrlMatch = VanityUrlPattern().Match(trimmed);
        if (vanityUrlMatch.Success)
        {
            return new SteamIdentifier(SteamIdentifierKind.VanityName, vanityUrlMatch.Groups[1].Value);
        }

        return VanityNamePattern().IsMatch(trimmed)
            ? new SteamIdentifier(SteamIdentifierKind.VanityName, trimmed)
            : null;
    }
}
