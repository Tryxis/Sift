using Sift.Api.Domain.Enums;

namespace Sift.Api.Contracts.Responses;

/// <summary>
/// One game as the frontend sees it: Steam's data, the owner's backlog config and any
/// enrichment, merged. Enrichment fields are null until the daily job has looked them up.
/// Private notes are only ever filled in for the owner.
/// </summary>
public sealed record LibraryGameResponse(
    int AppId,
    string Name,
    string HeaderImageUrl,
    string? IconUrl,
    int PlaytimeForeverMinutes,
    int PlaytimeTwoWeeksMinutes,
    DateTime? LastPlayedUtc,
    BacklogStatus Status,
    int? Priority,
    string? Notes,
    bool NotesPrivate,
    int? TimeToBeatMainMinutes,
    int? TimeToBeatMainExtrasMinutes,
    int? TimeToBeatCompletionistMinutes,
    double? ReviewScore,
    int? ReviewCount,
    decimal? FinishedHours,
    bool PlayedBefore,
    DateTime? StatusChangedUtc,
    bool NotInterested,
    IReadOnlyList<string> Genres,
    int? ReleaseYear,
    SteamDeckCompatibility? DeckCompatibility,
    bool? IsMultiplayer,
    int? AchievementsUnlocked,
    int? AchievementsTotal,
    AppKind Kind);
