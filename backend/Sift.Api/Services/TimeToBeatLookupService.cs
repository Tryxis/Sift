using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Enums;
using Sift.Api.Integrations.HowLongToBeat;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// Completion times for any app, owned or not (the wishlist uses this per row). Stored results
/// win; otherwise HowLongToBeat is searched on demand, at most a couple at a time process-wide,
/// so a page of wishlist rows can't hammer the site. Nothing is persisted.
/// </summary>
public sealed class TimeToBeatLookupService(
    AppDbContext db,
    IHowLongToBeatClient howLongToBeatClient,
    IOptions<HowLongToBeatOptions> options,
    IMemoryCache cache,
    ILogger<TimeToBeatLookupService> logger) : ITimeToBeatLookupService
{
    private const int MaxConcurrentSearches = 2;
    private static readonly SemaphoreSlim SearchGate = new(MaxConcurrentSearches, MaxConcurrentSearches);

    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);
    private static readonly TimeSpan FailureLifetime = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan SearchTimeout = TimeSpan.FromSeconds(15);

    public async Task<TimeToBeatResponse> GetAsync(int appId, string steamName, CancellationToken cancellationToken)
    {
        var cacheKey = CacheKey(appId);
        if (cache.TryGetValue(cacheKey, out TimeToBeatResponse? cached) && cached is not null)
        {
            return cached;
        }

        var stored = await db.HowLongToBeatEntries.AsNoTracking()
            .FirstOrDefaultAsync(h => h.AppId == appId, cancellationToken);
        if (stored is not null)
        {
            // A NotFound row means the daily job already searched and found nothing close enough.
            var fromTable = new TimeToBeatResponse(
                appId,
                stored.MainMinutes,
                stored.MainExtrasMinutes,
                stored.CompletionistMinutes,
                stored.MatchStatus == HowLongToBeatMatchStatus.Matched);
            cache.Set(cacheKey, fromTable, Lifetime);
            return fromTable;
        }

        if (!options.Value.Enabled)
        {
            return Unmatched(appId);
        }

        await SearchGate.WaitAsync(cancellationToken);
        try
        {
            // Another request for the same app may have finished while this one waited.
            if (cache.TryGetValue(cacheKey, out cached) && cached is not null)
            {
                return cached;
            }

            var (response, succeeded) = await SearchAsync(appId, steamName, cancellationToken);
            cache.Set(cacheKey, response, succeeded ? Lifetime : FailureLifetime);
            return response;
        }
        finally
        {
            SearchGate.Release();
        }
    }

    private async Task<(TimeToBeatResponse Response, bool Succeeded)> SearchAsync(
        int appId, string steamName, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(SearchTimeout);

        try
        {
            var results = await howLongToBeatClient.SearchAsync(
                HowLongToBeatMatcher.ToSearchTerm(steamName), timeout.Token);
            var match = HowLongToBeatMatcher.FindBestMatch(steamName, results);

            var response = match is null
                ? Unmatched(appId)
                : new TimeToBeatResponse(
                    appId,
                    ToMinutes(match.MainSeconds),
                    ToMinutes(match.MainExtrasSeconds),
                    ToMinutes(match.CompletionistSeconds),
                    Matched: true);
            return (response, true);
        }
        catch (Exception ex) when (ex is HowLongToBeatException
                                   || (ex is OperationCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning(ex, "On-demand HowLongToBeat lookup failed for {Name} ({AppId})", steamName, appId);
            return (Unmatched(appId), false);
        }
    }

    private static string CacheKey(int appId) => $"time-to-beat:{appId}";

    private static TimeToBeatResponse Unmatched(int appId) => new(appId, null, null, null, Matched: false);

    private static int? ToMinutes(int seconds) =>
        seconds > 0 ? (int)Math.Round(seconds / 60.0) : null;
}
