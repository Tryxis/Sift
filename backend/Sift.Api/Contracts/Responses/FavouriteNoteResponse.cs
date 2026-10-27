using Sift.Api.Domain.Enums;

namespace Sift.Api.Contracts.Responses;

/// <summary>A favourite's public note on one game, with enough context to show who wrote it and how far they got.</summary>
public sealed record FavouriteNoteResponse(
    string SteamId,
    string? Alias,
    string PersonaName,
    string? AvatarUrl,
    string Notes,
    BacklogStatus Status,
    int PlaytimeForeverMinutes,
    DateTime UpdatedUtc);
