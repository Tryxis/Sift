namespace Sift.Api.Contracts.Responses;

public sealed record ProfileResponse(
    string SteamId,
    string PersonaName,
    string? AvatarUrl,
    string? ProfileUrl,
    bool IsLibraryVisible,
    DateTime LastSyncedUtc,
    int GameCount);
