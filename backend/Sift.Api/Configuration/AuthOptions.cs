using Sift.Api.Integrations.Steam;

namespace Sift.Api.Configuration;

/// <summary>
/// Bound from the "Auth" section. Sign-in is through Steam (OpenID), so Sift never sees or stores a
/// password: a signed-in browser holds an encrypted cookie that names one SteamID64.
/// </summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    /// <summary>How long a sign-in lasts without use. Each visit extends it, up to MaxSessionDays.</summary>
    public int SessionDays { get; init; } = 30;

    /// <summary>
    /// The longest a sign-in can last however often it's used, so a copied cookie can't be kept
    /// alive forever. After this, the user signs in with Steam again.
    /// </summary>
    public int MaxSessionDays { get; init; } = 90;

    /// <summary>
    /// Lets visitors who aren't signed in (guests) look up and view any public profile, read-only.
    /// They can never change anything. On by default; false requires a sign-in for every read.
    /// </summary>
    public bool GuestBrowsing { get; init; } = true;

    /// <summary>
    /// Optional allow-list of SteamID64s that may sign in. Empty (the default) lets any Steam account
    /// sign in; each account can still only change its own library.
    /// </summary>
    public string[] AllowedSteamIds { get; init; } = [];

    public bool IsAllowed(string steamId) =>
        AllowedSteamIds.Length == 0 || AllowedSteamIds.Contains(steamId, StringComparer.Ordinal);

    public bool HasValidAllowList() => AllowedSteamIds.All(SteamIdentifierParser.IsSteamId64);
}
