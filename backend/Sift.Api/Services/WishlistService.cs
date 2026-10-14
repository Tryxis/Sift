using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Enums;
using Sift.Api.Exceptions;
using Sift.Api.Integrations.Steam;
using Sift.Api.Integrations.Steam.Models;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// A profile's Steam wishlist with store data merged in. Only the wishlist call itself can fail
/// the request; a store batch that fails just leaves those items' store fields null.
/// Completion times come from the HowLongToBeat table when Sift already has a match (read-only).
/// </summary>
public sealed class WishlistService(
    ISteamApiClient steamApiClient,
    AppDbContext db,
    IMemoryCache cache,
    ILogger<WishlistService> logger) : IWishlistService
{
    private const int StoreBatchSize = 50;
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(15);

    public async Task<IReadOnlyList<WishlistItemResponse>> GetAsync(string steamId, CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(steamId);

        var cacheKey = $"wishlist:{steamId}";
        if (cache.TryGetValue(cacheKey, out IReadOnlyList<WishlistItemResponse>? cached) && cached is not null)
        {
            return cached;
        }

        // Steam's own order: ranked items first (1 = top); 0 means unranked, so those go last.
        var wishlist = (await steamApiClient.GetWishlistAsync(steamId, cancellationToken))
            .Where(item => item.AppId > 0)
            .DistinctBy(item => item.AppId)
            .OrderBy(item => item.Priority == 0 ? int.MaxValue : item.Priority)
            .ThenBy(item => item.DateAddedUnixSeconds)
            .ToList();

        if (wishlist.Count == 0)
        {
            cache.Set(cacheKey, (IReadOnlyList<WishlistItemResponse>)[], Lifetime);
            return [];
        }

        var appIds = wishlist.Select(item => item.AppId).ToList();
        var storeItems = await GetStoreItemsAsync(appIds, cancellationToken);

        var timesToBeat = await db.HowLongToBeatEntries.AsNoTracking()
            .Where(h => appIds.Contains(h.AppId) && h.MatchStatus == HowLongToBeatMatchStatus.Matched)
            .ToDictionaryAsync(h => h.AppId, cancellationToken);

        var knownNames = await db.Apps.AsNoTracking()
            .Where(a => appIds.Contains(a.AppId))
            .ToDictionaryAsync(a => a.AppId, a => a.Name, cancellationToken);

        var response = wishlist.Select(item =>
        {
            storeItems.TryGetValue(item.AppId, out var store);
            timesToBeat.TryGetValue(item.AppId, out var timeToBeat);
            knownNames.TryGetValue(item.AppId, out var knownName);

            var reviews = store?.Reviews?.SummaryFiltered;
            var hasReviews = reviews?.ReviewCount is > 0;
            var price = store?.BestPurchaseOption;

            return new WishlistItemResponse(
                item.AppId,
                FirstNonBlank(store?.Name, knownName) ?? $"App {item.AppId}",
                SteamImageUrls.StoreAsset(store?.Assets?.AssetUrlFormat, store?.Assets?.Header)
                    ?? SteamImageUrls.HeaderImage(item.AppId),
                item.Priority,
                item.DateAddedUnixSeconds > 0
                    ? DateTimeOffset.FromUnixTimeSeconds(item.DateAddedUnixSeconds).UtcDateTime
                    : null,
                FormatReleaseDate(store?.Release),
                store?.Release?.IsComingSoon ?? false,
                hasReviews ? reviews!.PercentPositive : null,
                reviews?.ReviewCount,
                string.IsNullOrWhiteSpace(price?.FormattedFinalPrice) ? null : price.FormattedFinalPrice,
                price is null ? null : price.DiscountPercent ?? 0,
                store?.IsFree ?? false,
                timeToBeat?.MainMinutes,
                timeToBeat?.MainExtrasMinutes,
                timeToBeat?.CompletionistMinutes);
        }).ToList();

        cache.Set(cacheKey, (IReadOnlyList<WishlistItemResponse>)response, Lifetime);
        return response;
    }

    private async Task<Dictionary<int, SteamStoreItem>> GetStoreItemsAsync(
        IReadOnlyList<int> appIds, CancellationToken cancellationToken)
    {
        var found = new Dictionary<int, SteamStoreItem>();

        foreach (var batch in appIds.Chunk(StoreBatchSize))
        {
            try
            {
                var items = await steamApiClient.GetStoreItemsAsync(batch, cancellationToken);
                foreach (var item in items.Where(i => i.Success == 1))
                {
                    found[item.AppId > 0 ? item.AppId : item.Id] = item;
                }
            }
            catch (SteamApiException ex)
            {
                logger.LogWarning(ex, "Store data for {Count} wishlist apps couldn't be loaded", batch.Length);
            }
        }

        return found;
    }

    /// <summary>Matches the precision Steam shows on the store page, e.g. "17 Sep, 2020", "March 2026", "Q2 2026".</summary>
    private static string? FormatReleaseDate(SteamStoreItemRelease? release)
    {
        if (release is null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(release.CustomReleaseDateMessage))
        {
            return release.CustomReleaseDateMessage.Trim();
        }

        if (release.SteamReleaseDate is not > 0)
        {
            return release.IsComingSoon == true ? "Coming soon" : null;
        }

        var date = DateTimeOffset.FromUnixTimeSeconds(release.SteamReleaseDate.Value).UtcDateTime;
        var culture = CultureInfo.InvariantCulture;

        return release.ComingSoonDisplay switch
        {
            "date_month" => date.ToString("MMMM yyyy", culture),
            "date_quarter" => $"Q{(date.Month - 1) / 3 + 1} {date.Year.ToString(culture)}",
            "date_year" => date.Year.ToString(culture),
            "text_comingsoon" => "Coming soon",
            _ => date.ToString("d MMM, yyyy", culture)
        };
    }

    private static string? FirstNonBlank(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
}
