using System.Globalization;
using System.Security.Claims;
using Sift.Api.Integrations.Steam;

namespace Sift.Api.Infrastructure.Auth;

/// <summary>The signed-in user is their SteamID64, as verified by Steam, plus when they signed in.</summary>
public static class SiftClaims
{
    private const string SteamClaimedIdPrefix = "https://steamcommunity.com/openid/id/";

    /// <summary>Unix seconds of the Steam sign-in; unlike the cookie's issue time, sliding renewal doesn't move it.</summary>
    public const string SignedInAtClaim = "sift:signed_in_at";

    /// <summary>
    /// Steam's OpenID claimed identifier is "https://steamcommunity.com/openid/id/{SteamID64}".
    /// Anything else is rejected rather than guessed at.
    /// </summary>
    public static string? SteamIdFromClaimedId(string? claimedId)
    {
        if (claimedId is null || !claimedId.StartsWith(SteamClaimedIdPrefix, StringComparison.Ordinal))
        {
            return null;
        }

        var steamId = claimedId[SteamClaimedIdPrefix.Length..];
        return SteamIdentifierParser.IsSteamId64(steamId) ? steamId : null;
    }

    public static ClaimsPrincipal CreatePrincipal(string steamId, DateTimeOffset signedInAt, string authenticationType) =>
        new(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, steamId),
                new Claim(SignedInAtClaim, signedInAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture), ClaimValueTypes.Integer64),
            ],
            authenticationType));

    public static DateTimeOffset? GetSignedInAt(this ClaimsPrincipal user) =>
        long.TryParse(user.FindFirstValue(SignedInAtClaim), NumberStyles.None, CultureInfo.InvariantCulture, out var seconds)
            ? DateTimeOffset.FromUnixTimeSeconds(seconds)
            : null;

    public static string? GetSteamId(this ClaimsPrincipal user)
    {
        var steamId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return user.Identity?.IsAuthenticated == true && SteamIdentifierParser.IsSteamId64(steamId) ? steamId : null;
    }
}
