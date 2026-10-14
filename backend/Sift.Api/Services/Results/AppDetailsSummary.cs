using Sift.Api.Domain.Enums;

namespace Sift.Api.Services.Results;

/// <summary>The few stored store-page fields the library list needs, projected so descriptions aren't loaded.</summary>
public sealed record AppDetailsSummary(
    int AppId,
    string[] Genres,
    int? ReleaseYear,
    SteamDeckCompatibility DeckCompatibility,
    bool IsMultiplayer,
    string? StoreType);
