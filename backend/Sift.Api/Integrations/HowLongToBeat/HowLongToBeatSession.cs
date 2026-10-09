namespace Sift.Api.Integrations.HowLongToBeat;

/// <summary>
/// What the site's own search needs: the current search endpoint (it changes between
/// site releases) and a short-lived token pair from its init endpoint.
/// </summary>
public sealed record HowLongToBeatSession(
    string SearchPath,
    string? Token,
    string? HoneypotKey,
    string? HoneypotValue,
    DateTime IssuedUtc);
