using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Integrations.Steam;
using Sift.Api.Integrations.Steam.Models;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// A player's achievement progress for one game, live from Steam and held in memory briefly.
/// Definite answers (progress, or "no achievements") for games in a synced library are also
/// stored in achievement_progress so the library list can show them; failures and private
/// profiles aren't, since they say nothing about the game.
/// </summary>
public sealed class AchievementService(
    AppDbContext db,
    ISteamApiClient steamApiClient,
    IMemoryCache cache,
    TimeProvider timeProvider) : IAchievementService
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan FailureLifetime = TimeSpan.FromMinutes(2);

    public async Task<AchievementSummaryResponse> GetAsync(string steamId, int appId, CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(steamId);

        if (cache.TryGetValue(CacheKey(steamId, appId), out AchievementSummaryResponse? cached) && cached is not null)
        {
            return cached;
        }

        var (_, response) = await FetchAndStoreAsync(steamId, appId, cancellationToken);
        return response;
    }

    public async Task<SteamAchievementsOutcome> RefreshStoredAsync(
        string steamId, int appId, CancellationToken cancellationToken)
    {
        var (outcome, _) = await FetchAndStoreAsync(steamId, appId, cancellationToken);
        return outcome;
    }

    private async Task<(SteamAchievementsOutcome Outcome, AchievementSummaryResponse Response)> FetchAndStoreAsync(
        string steamId, int appId, CancellationToken cancellationToken)
    {
        var result = await steamApiClient.GetPlayerAchievementsAsync(steamId, appId, cancellationToken);

        var response = result.Outcome switch
        {
            SteamAchievementsOutcome.Available => new AchievementSummaryResponse(
                appId,
                Available: true,
                result.Total,
                result.Unlocked,
                result.Total > 0 ? result.Unlocked * 100.0 / result.Total : null,
                Reason: null),
            SteamAchievementsOutcome.NoAchievements => Unavailable(appId, "This game has no achievements."),
            SteamAchievementsOutcome.Private => Unavailable(appId, "Achievements are private on this profile."),
            _ => Unavailable(appId, "Achievements couldn't be loaded.")
        };

        if (result.Outcome is SteamAchievementsOutcome.Available or SteamAchievementsOutcome.NoAchievements)
        {
            await StoreAsync(steamId, appId, result, cancellationToken);
        }

        cache.Set(CacheKey(steamId, appId), response,
            result.Outcome == SteamAchievementsOutcome.Failed ? FailureLifetime : Lifetime);
        return (result.Outcome, response);
    }

    /// <summary>Only games in a synced library are stored; anything else is just cached.</summary>
    private async Task StoreAsync(
        string steamId, int appId, SteamAchievementsResult result, CancellationToken cancellationToken)
    {
        if (!await db.OwnedGames.AnyAsync(g => g.SteamId == steamId && g.AppId == appId, cancellationToken))
        {
            return;
        }

        try
        {
            await UpsertAsync(steamId, appId, result, cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // A concurrent request stored this game first; update their row instead.
            db.ChangeTracker.Clear();
            await UpsertAsync(steamId, appId, result, cancellationToken);
        }
    }

    private async Task UpsertAsync(
        string steamId, int appId, SteamAchievementsResult result, CancellationToken cancellationToken)
    {
        var row = await db.AchievementProgress.FindAsync([steamId, appId], cancellationToken);
        if (row is null)
        {
            row = new AchievementProgress { SteamId = steamId, AppId = appId };
            db.AchievementProgress.Add(row);
        }

        row.Available = result.Outcome == SteamAchievementsOutcome.Available;
        row.Total = result.Total;
        row.Unlocked = result.Unlocked;
        row.CheckedUtc = timeProvider.GetUtcNow().UtcDateTime;

        await db.SaveChangesAsync(cancellationToken);
    }

    private static string CacheKey(string steamId, int appId) => $"achievements:{steamId}:{appId}";

    private static AchievementSummaryResponse Unavailable(int appId, string reason) =>
        new(appId, Available: false, Total: 0, Unlocked: 0, Percent: null, reason);
}
