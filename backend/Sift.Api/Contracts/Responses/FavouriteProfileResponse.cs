namespace Sift.Api.Contracts.Responses;

public sealed record FavouriteProfileResponse(
    string SteamId,
    string? Alias,
    string PersonaName,
    string? AvatarUrl,
    DateTime AddedUtc);
