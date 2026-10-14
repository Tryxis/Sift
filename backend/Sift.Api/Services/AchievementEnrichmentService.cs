using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Data;
using Sift.Api.Integrations.Steam.Models;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// Keeps achievement_progress current for each synced profile's played games (playtime &gt; 0).
/// A game is due when it has no row; when its row is older than RefreshAfterDays and it has been
/// played since; or, for games with no achievements, when the row is older than
/// UnavailableRefreshAfterDays. Never-checked games go first (most recently played first), then
/// the oldest rows. A private profile is skipped for the rest of the run.
/// </summary>
public sealed class AchievementEnrichmentService(
    AppDbContext db,
    IAchievementService achievementService,
    IOptions<AchievementOptions> options,
    TimeProvider timeProvider,
    ILogger<AchievementEnrichmentService> logger) : IAchievementEnrichmentService
{
    private const int MaxConsecutiveFailures = 3;

    public async Task<int> RefreshStaleAsync(CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return 0;
        }

        var steamIds = await db.Profiles
            .AsNoTracking()
            .Where(p => p.IsLibraryVisible)
            .OrderBy(p => p.SteamId)
            .Select(p => p.SteamId)
            .ToListAsync(cancellationToken);

        var callsLeft = settings.MaxCallsPerRun;
        var stored = 0;

        foreach (var steamId in steamIds)
        {
            if (callsLeft <= 0)
            {
                break;
            }

            var due = await FindDueAppIdsAsync(steamId, settings, callsLeft, cancellationToken);
            var consecutiveFailures = 0;

            foreach (var appId in due)
            {
                callsLeft--;
                var outcome = await achievementService.RefreshStoredAsync(steamId, appId, cancellationToken);

                if (outcome == SteamAchievementsOutcome.Private)
                {
                    logger.LogInformation("Achievements are private for {SteamId}; skipping that profile this run", steamId);
                    break;
                }

                if (outcome == SteamAchievementsOutcome.Failed)
                {
                    if (++consecutiveFailures >= MaxConsecutiveFailures)
                    {
                        logger.LogWarning("Steam achievements unavailable; stopping the achievements step until the next run");
                        return stored;
                    }
                }
                else
                {
                    stored++;
                    consecutiveFailures = 0;
                }

                await Task.Delay(settings.RequestDelayMilliseconds, cancellationToken);
            }
        }

        return stored;
    }

    private async Task<List<int>> FindDueAppIdsAsync(
        string steamId, AchievementOptions settings, int limit, CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var refreshCutoff = now.AddDays(-settings.RefreshAfterDays);
        var unavailableCutoff = now.AddDays(-settings.UnavailableRefreshAfterDays);

        var played = await db.OwnedGames
            .AsNoTracking()
            .Where(g => g.SteamId == steamId && g.PlaytimeForeverMinutes > 0)
            .Select(g => new { g.AppId, g.LastPlayedUtc })
            .ToListAsync(cancellationToken);

        var progress = await db.AchievementProgress
            .AsNoTracking()
            .Where(a => a.SteamId == steamId)
            .ToDictionaryAsync(a => a.AppId, cancellationToken);

        var missing = played
            .Where(g => !progress.ContainsKey(g.AppId))
            .OrderByDescending(g => g.LastPlayedUtc ?? DateTime.MinValue)
            .ThenBy(g => g.AppId)
            .Select(g => g.AppId);

        var stale = played
            .Select(g => (g.AppId, g.LastPlayedUtc, Row: progress.GetValueOrDefault(g.AppId)))
            .Where(g => g.Row is not null
                        && (g.Row.Available
                            ? g.Row.CheckedUtc < refreshCutoff && g.LastPlayedUtc > g.Row.CheckedUtc
                            : g.Row.CheckedUtc < unavailableCutoff))
            .OrderBy(g => g.Row!.CheckedUtc)
            .Select(g => g.AppId);

        return missing.Concat(stale).Take(limit).ToList();
    }
}
