using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Domain.Enums;
using Sift.Api.Integrations.HowLongToBeat;
using Sift.Api.Integrations.HowLongToBeat.Models;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// Looks up each owned game on HowLongToBeat at most once per RefreshAfterDays,
/// one search at a time with a pause between, and stops the run early if the site
/// starts refusing requests.
/// </summary>
public sealed class HowLongToBeatService(
    AppDbContext db,
    IHowLongToBeatClient howLongToBeatClient,
    IOptions<HowLongToBeatOptions> options,
    IOptions<EnrichmentOptions> enrichmentOptions,
    TimeProvider timeProvider,
    ILogger<HowLongToBeatService> logger) : IHowLongToBeatService
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

        var apps = await db.Apps
            .Where(a => ownedAppIds.Contains(a.AppId))
            .Where(a => !db.HowLongToBeatEntries.Any(h => h.AppId == a.AppId && h.LastCheckedUtc > cutoff))
            .OrderBy(a => db.HowLongToBeatEntries.Any(h => h.AppId == a.AppId))
            .ThenBy(a => a.AppId)
            .Select(a => new { a.AppId, a.Name })
            .Take(enrichmentOptions.Value.MaxAppsPerRun)
            .ToListAsync(cancellationToken);

        var checkedCount = 0;
        var consecutiveFailures = 0;

        foreach (var app in apps)
        {
            try
            {
                var results = await howLongToBeatClient.SearchAsync(
                    HowLongToBeatMatcher.ToSearchTerm(app.Name), cancellationToken);
                var match = HowLongToBeatMatcher.FindBestMatch(app.Name, results);

                await UpsertAsync(app.AppId, match, now, cancellationToken);
                checkedCount++;
                consecutiveFailures = 0;
            }
            catch (HowLongToBeatException ex)
            {
                logger.LogWarning(ex, "HowLongToBeat lookup failed for {Name} ({AppId})", app.Name, app.AppId);
                if (++consecutiveFailures >= MaxConsecutiveFailures)
                {
                    logger.LogWarning(
                        "HowLongToBeat is refusing or has changed; stopping until the next run. " +
                        "If this keeps happening, HowLongToBeatClient needs updating.");
                    break;
                }
            }

            await Task.Delay(settings.RequestDelayMilliseconds, cancellationToken);
        }

        return checkedCount;
    }

    private async Task UpsertAsync(int appId, HowLongToBeatGame? match, DateTime now, CancellationToken cancellationToken)
    {
        var entry = await db.HowLongToBeatEntries.FindAsync([appId], cancellationToken);
        if (entry is null)
        {
            entry = new HowLongToBeatEntry { AppId = appId };
            db.HowLongToBeatEntries.Add(entry);
        }

        entry.MatchStatus = match is null ? HowLongToBeatMatchStatus.NotFound : HowLongToBeatMatchStatus.Matched;
        entry.HowLongToBeatGameId = match?.GameId;
        entry.HowLongToBeatName = match?.Name;
        entry.MainMinutes = ToMinutes(match?.MainSeconds);
        entry.MainExtrasMinutes = ToMinutes(match?.MainExtrasSeconds);
        entry.CompletionistMinutes = ToMinutes(match?.CompletionistSeconds);
        entry.LastCheckedUtc = now;

        await db.SaveChangesAsync(cancellationToken);
    }

    private static int? ToMinutes(int? seconds) =>
        seconds is > 0 ? (int)Math.Round(seconds.Value / 60.0) : null;
}
