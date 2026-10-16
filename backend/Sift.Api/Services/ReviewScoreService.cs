using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Domain.Scoring;
using Sift.Api.Integrations.Steam.Store;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

public sealed class ReviewScoreService(
    AppDbContext db,
    ISteamStoreClient steamStoreClient,
    IOptions<ReviewScoreOptions> options,
    IOptions<EnrichmentOptions> enrichmentOptions,
    TimeProvider timeProvider,
    ILogger<ReviewScoreService> logger) : IReviewScoreService
{
    private const int MaxConsecutiveFailures = 3;

    public async Task<int> RefreshStaleAsync(CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return 0;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var cutoff = now.AddDays(-settings.RefreshAfterDays);
        var ownedAppIds = db.OwnedGames.Select(g => g.AppId).Distinct();

        // Never-checked apps first, then the oldest.
        var appIds = await db.Apps
            .Where(a => ownedAppIds.Contains(a.AppId))
            .Where(a => !db.ReviewSummaries.Any(r => r.AppId == a.AppId && r.LastCheckedUtc > cutoff))
            .OrderBy(a => db.ReviewSummaries.Any(r => r.AppId == a.AppId))
            .ThenBy(a => db.ReviewSummaries.Where(r => r.AppId == a.AppId).Select(r => (DateTime?)r.LastCheckedUtc).FirstOrDefault())
            .ThenBy(a => a.AppId)
            .Select(a => a.AppId)
            .Take(enrichmentOptions.Value.MaxAppsPerRun)
            .ToListAsync(cancellationToken);

        var updated = 0;
        var consecutiveFailures = 0;

        foreach (var appId in appIds)
        {
            try
            {
                var summary = await steamStoreClient.GetReviewSummaryAsync(appId, cancellationToken);
                if (summary is not null)
                {
                    await UpsertAsync(appId, summary.TotalPositive, summary.TotalNegative, now, cancellationToken);
                    updated++;
                }
                else
                {
                    // success != 1 (typically delisted): record the check so the app backs off
                    // like any other instead of staying at the front of the queue forever.
                    await MarkCheckedAsync(appId, now, cancellationToken);
                }
                consecutiveFailures = 0;
            }
            catch (Exception ex) when (ex is HttpRequestException or System.Text.Json.JsonException
                                       || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
            {
                logger.LogWarning(ex, "Review score lookup failed for app {AppId}", appId);
                if (++consecutiveFailures >= MaxConsecutiveFailures)
                {
                    logger.LogWarning("Steam store unavailable; stopping review refresh until the next run");
                    break;
                }
            }

            await Task.Delay(settings.RequestDelayMilliseconds, cancellationToken);
        }

        return updated;
    }

    /// <summary>
    /// Keeps any counts Steam gave before (a temporary hiccup shouldn't erase them); a new row has
    /// zero reviews, which the library shows as unknown.
    /// </summary>
    private async Task MarkCheckedAsync(int appId, DateTime now, CancellationToken cancellationToken)
    {
        var summary = await db.ReviewSummaries.FindAsync([appId], cancellationToken);
        if (summary is null)
        {
            db.ReviewSummaries.Add(new SteamReviewSummary { AppId = appId, Rating = null, LastCheckedUtc = now });
        }
        else
        {
            summary.LastCheckedUtc = now;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task UpsertAsync(int appId, int positive, int negative, DateTime now, CancellationToken cancellationToken)
    {
        var summary = await db.ReviewSummaries.FindAsync([appId], cancellationToken);
        if (summary is null)
        {
            summary = new SteamReviewSummary { AppId = appId };
            db.ReviewSummaries.Add(summary);
        }

        summary.TotalPositive = positive;
        summary.TotalNegative = negative;
        summary.Rating = SteamDbRating.Calculate(positive, negative);
        summary.LastCheckedUtc = now;

        await db.SaveChangesAsync(cancellationToken);
    }
}
