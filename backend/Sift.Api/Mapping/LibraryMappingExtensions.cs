using Sift.Api.Contracts.Responses;
using Sift.Api.Domain.Entities;
using Sift.Api.Domain.Enums;
using Sift.Api.Integrations.Steam;

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
    /// </summary>
    public static LibraryGameResponse ToLibraryGameResponse(
        this OwnedGame owned,
        BacklogEntry? entry,
        HowLongToBeatEntry? timeToBeat,
        SteamReviewSummary? reviews) =>
        new(
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
            reviews?.Rating,
            reviews is null ? null : reviews.TotalPositive + reviews.TotalNegative,
            entry?.FinishedHours,
            entry?.PlayedBefore ?? false);
}
