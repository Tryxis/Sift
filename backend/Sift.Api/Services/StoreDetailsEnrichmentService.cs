using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Data;
using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;

namespace Sift.Api.Services;

/// <summary>
/// Fills steam_app_details for owned apps: missing rows first, then the oldest. Steam's appdetails
/// endpoint is rate limited (~200 calls per 5 minutes), so calls are spaced out and a 429 pauses
/// the step; repeated 429s or failures end it until the next run.
/// </summary>
public sealed class StoreDetailsEnrichmentService(
    AppDbContext db,
    IAppDetailsService appDetailsService,
    IOptions<StoreDetailsOptions> options,
    TimeProvider timeProvider,
    ILogger<StoreDetailsEnrichmentService> logger) : IStoreDetailsEnrichmentService
{
    private const int MaxConsecutiveFailures = 3;

    public async Task<int> RefreshStaleAsync(CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return 0;
        }

        var cutoff = timeProvider.GetUtcNow().UtcDateTime.AddDays(-settings.RefreshAfterDays);
        var ownedAppIds = db.OwnedGames.Select(g => g.AppId).Distinct();

        var appIds = await db.Apps
            .Where(a => ownedAppIds.Contains(a.AppId))
            .Where(a => !db.AppDetails.Any(d => d.AppId == a.AppId && d.CheckedUtc > cutoff))
            .OrderBy(a => db.AppDetails.Any(d => d.AppId == a.AppId))
            .ThenBy(a => db.AppDetails.Where(d => d.AppId == a.AppId).Select(d => d.CheckedUtc).FirstOrDefault())
            .ThenBy(a => a.AppId)
            .Select(a => a.AppId)
            .Take(settings.MaxAppsPerRun)
            .ToListAsync(cancellationToken);

        var stored = 0;
        var consecutiveFailures = 0;
        var backoffs = 0;

        for (var index = 0; index < appIds.Count; index++)
        {
            var outcome = await appDetailsService.RefreshStoredAsync(appIds[index], cancellationToken);
            switch (outcome)
            {
                case StoreDetailsRefreshOutcome.Stored:
                    stored++;
                    consecutiveFailures = 0;
                    break;

                case StoreDetailsRefreshOutcome.RateLimited:
                    if (++backoffs > settings.MaxRateLimitBackoffsPerRun)
                    {
                        logger.LogWarning("Steam store keeps rate limiting; stopping store details until the next run");
                        return stored;
                    }
                    logger.LogInformation("Steam store rate limited; pausing store details for {Seconds}s",
                        settings.RateLimitBackoffSeconds);
                    await Task.Delay(TimeSpan.FromSeconds(settings.RateLimitBackoffSeconds), cancellationToken);
                    index--; // Try the same app again.
                    continue;

                default:
                    if (++consecutiveFailures >= MaxConsecutiveFailures)
                    {
                        logger.LogWarning("Steam store unavailable; stopping store details until the next run");
                        return stored;
                    }
                    break;
            }

            await Task.Delay(settings.RequestDelayMilliseconds, cancellationToken);
        }

        return stored;
    }
}
