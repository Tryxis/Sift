using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Enums;
using Sift.Api.Integrations.Steam.Store;
using Sift.Api.Integrations.Steam.Store.Models;
using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;
using StoredAppDetails = Sift.Api.Domain.Entities.SteamAppDetails;

namespace Sift.Api.Services;

/// <summary>
/// Store-page details and Steam Deck rating for one app. Served from steam_app_details while the
/// row is fresh; otherwise fetched from the public store endpoints and stored (for apps Sift
/// knows about). Responses are also held in memory; one built from a failed lookup only briefly.
/// </summary>
public sealed partial class AppDetailsService(
    AppDbContext db,
    ISteamStoreClient steamStoreClient,
    IMemoryCache cache,
    IOptions<StoreDetailsOptions> options,
    TimeProvider timeProvider,
    ILogger<AppDetailsService> logger) : IAppDetailsService
{
    private static readonly TimeSpan SuccessLifetime = TimeSpan.FromHours(24);
    private static readonly TimeSpan FailureLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(15);

    private const int MaxReleaseDateLength = 64;
    private const int MaxMetacriticUrlLength = 512;
    private const int MaxShortDescriptionLength = 2000;
    private const int MaxStoreTypeLength = 32;

    private static readonly HashSet<string> MultiplayerCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Multi-player", "Online PvP", "Online Co-op", "Shared/Split Screen",
        "LAN PvP", "LAN Co-op", "Cross-Platform Multiplayer", "MMO"
    };

    public async Task<AppDetailsResponse> GetAsync(int appId, CancellationToken cancellationToken)
    {
        var cacheKey = CacheKey(appId);
        if (cache.TryGetValue(cacheKey, out AppDetailsResponse? cached) && cached is not null)
        {
            return cached;
        }

        var stored = await db.AppDetails.AsNoTracking()
            .FirstOrDefaultAsync(d => d.AppId == appId, cancellationToken);
        if (stored is not null && IsFresh(stored))
        {
            return CacheResponse(stored, SuccessLifetime);
        }

        var fetched = await FetchFromSteamAsync(appId, cancellationToken);
        if (fetched.Succeeded)
        {
            await StoreAsync(fetched.Details, cancellationToken);
            return CacheResponse(fetched.Details, SuccessLifetime);
        }

        // Steam failed: stale stored details beat a half-empty response.
        return CacheResponse(stored ?? fetched.Details, FailureLifetime);
    }

    public async Task<StoreDetailsRefreshOutcome> RefreshStoredAsync(int appId, CancellationToken cancellationToken)
    {
        var fetched = await FetchFromSteamAsync(appId, cancellationToken);
        if (fetched.RateLimited)
        {
            return StoreDetailsRefreshOutcome.RateLimited;
        }
        if (!fetched.Succeeded)
        {
            return StoreDetailsRefreshOutcome.Failed;
        }

        await StoreAsync(fetched.Details, cancellationToken);
        CacheResponse(fetched.Details, SuccessLifetime);
        return StoreDetailsRefreshOutcome.Stored;
    }

    private bool IsFresh(StoredAppDetails details) =>
        details.CheckedUtc > timeProvider.GetUtcNow().UtcDateTime.AddDays(-options.Value.RefreshAfterDays);

    private AppDetailsResponse CacheResponse(StoredAppDetails details, TimeSpan lifetime)
    {
        var response = ToResponse(details);
        cache.Set(CacheKey(details.AppId), response, lifetime);
        return response;
    }

    private async Task<(bool Succeeded, bool RateLimited, StoredAppDetails Details)> FetchFromSteamAsync(
        int appId, CancellationToken cancellationToken)
    {
        var detailsTask = FetchAsync(appId, "details", steamStoreClient.GetAppDetailsAsync, cancellationToken);
        var deckTask = FetchAsync(appId, "Steam Deck report", steamStoreClient.GetDeckCompatibilityCategoryAsync, cancellationToken);
        await Task.WhenAll(detailsTask, deckTask);

        var (detailsOk, detailsRateLimited, details) = await detailsTask;
        var (deckOk, deckRateLimited, deckCategory) = await deckTask;

        // A null details payload with a successful call means "no store page": still worth storing,
        // so the job doesn't ask again until the row is stale.
        return (detailsOk && deckOk, detailsRateLimited || deckRateLimited, ToEntity(appId, details, deckCategory));
    }

    private async Task<(bool Succeeded, bool RateLimited, T? Value)> FetchAsync<T>(
        int appId,
        string what,
        Func<int, CancellationToken, Task<T?>> fetch,
        CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(RequestTimeout);

        try
        {
            return (true, false, await fetch(appId, timeout.Token));
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
        {
            logger.LogWarning("Steam store {What} lookup for app {AppId} was rate limited (429)", what, appId);
            return (false, true, default);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or NotSupportedException
                                   || (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning(ex, "Steam store {What} lookup failed for app {AppId}", what, appId);
            return (false, false, default);
        }
    }

    /// <summary>Upserts the row. Skipped for apps not in steam_apps (e.g. wishlist-only), which stay memory-cached.</summary>
    private async Task StoreAsync(StoredAppDetails fetched, CancellationToken cancellationToken)
    {
        if (!await db.Apps.AnyAsync(a => a.AppId == fetched.AppId, cancellationToken))
        {
            return;
        }

        try
        {
            await UpsertAsync(fetched, cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // A concurrent request stored this app first; update their row instead.
            db.ChangeTracker.Clear();
            await UpsertAsync(fetched, cancellationToken);
        }
    }

    private async Task UpsertAsync(StoredAppDetails fetched, CancellationToken cancellationToken)
    {
        var row = await db.AppDetails.FindAsync([fetched.AppId], cancellationToken);
        if (row is null)
        {
            db.AppDetails.Add(fetched);
        }
        else
        {
            row.StoreType = fetched.StoreType;
            row.Genres = fetched.Genres;
            row.Categories = fetched.Categories;
            row.Developers = fetched.Developers;
            row.Publishers = fetched.Publishers;
            row.ReleaseDate = fetched.ReleaseDate;
            row.ReleaseYear = fetched.ReleaseYear;
            row.ComingSoon = fetched.ComingSoon;
            row.MetacriticScore = fetched.MetacriticScore;
            row.MetacriticUrl = fetched.MetacriticUrl;
            row.DeckCompatibility = fetched.DeckCompatibility;
            row.IsMultiplayer = fetched.IsMultiplayer;
            row.IsSingleplayer = fetched.IsSingleplayer;
            row.ShortDescription = fetched.ShortDescription;
            row.CheckedUtc = fetched.CheckedUtc;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private StoredAppDetails ToEntity(int appId, SteamAppDetails? details, int? deckCategory)
    {
        var categories = Descriptions(details?.Categories);
        var releaseDate = string.IsNullOrWhiteSpace(details?.ReleaseDate?.Date) ? null : details.ReleaseDate.Date.Trim();
        var description = string.IsNullOrWhiteSpace(details?.ShortDescription)
            ? null
            : WebUtility.HtmlDecode(details.ShortDescription).Trim();
        var metacriticUrl = string.IsNullOrWhiteSpace(details?.Metacritic?.Url) ? null : details.Metacritic.Url;

        return new StoredAppDetails
        {
            AppId = appId,
            StoreType = Truncate(string.IsNullOrWhiteSpace(details?.Type) ? null : details.Type.Trim().ToLowerInvariant(), MaxStoreTypeLength),
            ShortDescription = Truncate(description, MaxShortDescriptionLength),
            Genres = Descriptions(details?.Genres),
            Categories = categories,
            Developers = Clean(details?.Developers),
            Publishers = Clean(details?.Publishers),
            ReleaseDate = Truncate(releaseDate, MaxReleaseDateLength),
            ReleaseYear = ParseReleaseYear(releaseDate),
            ComingSoon = details?.ReleaseDate?.ComingSoon ?? false,
            MetacriticScore = details?.Metacritic?.Score,
            MetacriticUrl = metacriticUrl is { Length: > MaxMetacriticUrlLength } ? null : metacriticUrl,
            DeckCompatibility = deckCategory switch
            {
                3 => SteamDeckCompatibility.Verified,
                2 => SteamDeckCompatibility.Playable,
                1 => SteamDeckCompatibility.Unsupported,
                _ => SteamDeckCompatibility.Unknown
            },
            IsMultiplayer = categories.Any(MultiplayerCategories.Contains),
            IsSingleplayer = categories.Contains("Single-player", StringComparer.OrdinalIgnoreCase),
            CheckedUtc = timeProvider.GetUtcNow().UtcDateTime
        };
    }

    private static AppDetailsResponse ToResponse(StoredAppDetails details) =>
        new(
            details.AppId,
            details.ShortDescription,
            details.Genres,
            details.Categories,
            details.Developers,
            details.Publishers,
            details.ReleaseDate,
            details.ComingSoon,
            details.MetacriticScore,
            details.MetacriticUrl,
            details.DeckCompatibility,
            details.IsMultiplayer,
            details.IsSingleplayer);

    /// <summary>The last plausible four-digit year in Steam's display string ("17 Sep, 2020", "Q1 2025").</summary>
    internal static int? ParseReleaseYear(string? releaseDate)
    {
        if (string.IsNullOrWhiteSpace(releaseDate))
        {
            return null;
        }

        int? year = null;
        foreach (Match match in YearPattern().Matches(releaseDate))
        {
            var candidate = int.Parse(match.Value, System.Globalization.CultureInfo.InvariantCulture);
            if (candidate is >= 1970 and <= 2100)
            {
                year = candidate;
            }
        }
        return year;
    }

    [GeneratedRegex(@"(?<!\d)\d{4}(?!\d)")]
    private static partial Regex YearPattern();

    private static string CacheKey(int appId) => $"app-details:{appId}";

    private static string? Truncate(string? value, int maxLength) =>
        value is { Length: > 0 } && value.Length > maxLength ? value[..maxLength] : value;

    private static string[] Descriptions(List<SteamAppDescriptor>? items) =>
        Clean(items?.Select(item => item.Description));

    private static string[] Clean(IEnumerable<string?>? values) =>
        values?
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => WebUtility.HtmlDecode(value!).Trim())
            .Distinct()
            .ToArray()
        ?? [];
}
