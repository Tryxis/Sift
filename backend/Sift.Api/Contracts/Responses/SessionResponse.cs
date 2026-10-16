namespace Sift.Api.Contracts.Responses;

/// <summary>Whether this browser is signed in, and as which SteamID64.</summary>
public sealed record SessionResponse(bool SignedIn, string? SteamId);
