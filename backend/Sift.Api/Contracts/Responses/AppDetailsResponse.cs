using Sift.Api.Domain.Enums;

namespace Sift.Api.Contracts.Responses;

/// <summary>Store-page details for one app. Fields are empty or null when Steam has no store page for it.</summary>
public sealed record AppDetailsResponse(
    int AppId,
    string? ShortDescription,
    IReadOnlyList<string> Genres,
    IReadOnlyList<string> Categories,
    IReadOnlyList<string> Developers,
    IReadOnlyList<string> Publishers,
    string? ReleaseDate,
    bool ComingSoon,
    int? MetacriticScore,
    string? MetacriticUrl,
    SteamDeckCompatibility DeckCompatibility,
    bool IsMultiplayer,
    bool IsSingleplayer);
