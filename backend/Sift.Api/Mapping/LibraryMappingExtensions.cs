using Sift.Api.Contracts.Responses;
using Sift.Api.Domain.Entities;
using Sift.Api.Domain.Enums;
using Sift.Api.Integrations.Steam;
using Sift.Api.Services.Results;

namespace Sift.Api.Mapping;

public static class LibraryMappingExtensions
{
    public static ProfileResponse ToResponse(this SteamProfile profile, int gameCount) =>
        new(
            profile.SteamId,
            profile.PersonaName,
            profile.AvatarUrl,
            profile.ProfileUrl,
            profile.IsLibraryVisible,
            profile.LastSyncedUtc,
            gameCount);

    /// <summary>
    /// Merges Steam-owned data with the owner's backlog entry and any enrichment.
    /// A missing backlog entry means the game has never been organised, so it defaults to Backlog.
    /// A review row with no reviews (including delisted apps) reads as unknown: score and count null.
    /// </summary>
    public static LibraryGameResponse ToLibraryGameResponse(
        this OwnedGame owned,
        BacklogEntry? entry,
        HowLongToBeatEntry? timeToBeat,
        SteamReviewSummary? reviews,
        AppDetailsSummary? details,
        AchievementProgress? achievements)
    {
        var reviewCount = reviews is null ? 0 : reviews.TotalPositive + reviews.TotalNegative;
        var hasAchievements = achievements is { Available: true };

        return new(
            owned.AppId,
            owned.App.Name,
            SteamImageUrls.HeaderImage(owned.AppId),
            SteamImageUrls.Icon(owned.AppId, owned.App.IconHash),
            owned.PlaytimeForeverMinutes,
            owned.PlaytimeTwoWeeksMinutes,
            owned.LastPlayedUtc,
            entry?.Status ?? BacklogStatus.Backlog,
            entry?.Priority,
            entry?.Notes,
            timeToBeat?.MainMinutes,
            timeToBeat?.MainExtrasMinutes,
            timeToBeat?.CompletionistMinutes,
            reviewCount > 0 ? reviews!.Rating : null,
            reviewCount > 0 ? reviewCount : null,
            entry?.FinishedHours,
            entry?.PlayedBefore ?? false,
            entry?.StatusChangedUtc,
            entry?.NotInterested ?? false,
            details?.Genres ?? [],
            details?.ReleaseYear,
            details?.DeckCompatibility,
            details?.IsMultiplayer,
            hasAchievements ? achievements!.Unlocked : null,
            hasAchievements ? achievements!.Total : null);
    }
}
