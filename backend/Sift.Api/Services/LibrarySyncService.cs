using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Exceptions;
using Sift.Api.Infrastructure.BackgroundJobs;
using Sift.Api.Integrations.Steam;
using Sift.Api.Integrations.Steam.Models;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// Writes only Steam-owned tables (profiles, apps, owned games).
/// Backlog entries are deliberately never touched here, which is what keeps a
/// user's organisation safe across any number of re-syncs.
/// </summary>
public sealed class LibrarySyncService(
    AppDbContext db,
    ISteamApiClient steamApiClient,
    ISteamIdResolver steamIdResolver,
    ILibraryQueryService libraryQueryService,
    IEnrichmentTrigger enrichmentTrigger,
    TimeProvider timeProvider,
    ILogger<LibrarySyncService> logger) : ILibrarySyncService
{
    public async Task<LibraryResponse> SyncAsync(string identifier, CancellationToken cancellationToken)
    {
        var steamId = await steamIdResolver.ResolveAsync(identifier, cancellationToken);

        var summary = await steamApiClient.GetPlayerSummaryAsync(steamId, cancellationToken)
            ?? throw new SteamProfileNotFoundException(identifier);
        var ownedGames = await steamApiClient.GetOwnedGamesAsync(steamId, cancellationToken);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var isLibraryVisible = ownedGames.Games is not null;

        await UpsertProfileAsync(summary, isLibraryVisible, now, cancellationToken);

        // A private library comes back empty. Treat that as "unknown", not "owns nothing",
        // so going private temporarily doesn't wipe stored games.
        var newAppCount = 0;
        if (isLibraryVisible)
        {
            var games = ownedGames.Games!.DistinctBy(g => g.AppId).ToList();
            newAppCount = await UpsertAppsAsync(games, now, cancellationToken);
            await ReplaceOwnedGamesAsync(steamId, games, now, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);

        // Games we've never seen have no review score or completion time yet; fetch them
        // soon rather than waiting for tomorrow's run.
        if (newAppCount > 0)
        {
            enrichmentTrigger.RequestRun();
        }

        logger.LogInformation("Synced profile {SteamId}: {GameCount} games, visible={Visible}",
            steamId, ownedGames.Games?.Count ?? 0, isLibraryVisible);

        return await libraryQueryService.GetLibraryAsync(steamId, cancellationToken);
    }

    private async Task UpsertProfileAsync(
        SteamPlayerSummary summary, bool isLibraryVisible, DateTime now, CancellationToken cancellationToken)
    {
        var profile = await db.Profiles.FindAsync([summary.SteamId], cancellationToken);
        if (profile is null)
        {
            profile = new SteamProfile { SteamId = summary.SteamId };
            db.Profiles.Add(profile);
        }

        profile.PersonaName = summary.PersonaName;
        profile.AvatarUrl = summary.AvatarFullUrl;
        profile.ProfileUrl = summary.ProfileUrl;
        profile.IsLibraryVisible = isLibraryVisible;
        profile.LastSyncedUtc = now;
    }

    /// <returns>How many apps were new to the database.</returns>
    private async Task<int> UpsertAppsAsync(
        IReadOnlyCollection<SteamOwnedGame> games, DateTime now, CancellationToken cancellationToken)
    {
        var appIds = games.Select(g => g.AppId).ToList();
        var existing = await db.Apps
            .Where(a => appIds.Contains(a.AppId))
            .ToDictionaryAsync(a => a.AppId, cancellationToken);

        var added = 0;
        foreach (var game in games)
        {
            if (!existing.TryGetValue(game.AppId, out var app))
            {
                app = new SteamApp { AppId = game.AppId };
                db.Apps.Add(app);
                added++;
            }

            app.Name = string.IsNullOrWhiteSpace(game.Name) ? $"App {game.AppId}" : game.Name;
            app.IconHash = game.IconHash;
            app.LastUpdatedUtc = now;
        }

        return added;
    }

    private async Task ReplaceOwnedGamesAsync(
        string steamId, IReadOnlyCollection<SteamOwnedGame> games, DateTime now, CancellationToken cancellationToken)
    {
        var existing = await db.OwnedGames
            .Where(g => g.SteamId == steamId)
            .ToDictionaryAsync(g => g.AppId, cancellationToken);

        foreach (var game in games)
        {
            if (!existing.Remove(game.AppId, out var owned))
            {
                owned = new OwnedGame { SteamId = steamId, AppId = game.AppId };
                db.OwnedGames.Add(owned);
            }

            owned.PlaytimeForeverMinutes = game.PlaytimeForeverMinutes;
            owned.PlaytimeTwoWeeksMinutes = game.PlaytimeTwoWeeksMinutes;
            owned.LastPlayedUtc = game.LastPlayedUnixSeconds > 0
                ? DateTimeOffset.FromUnixTimeSeconds(game.LastPlayedUnixSeconds).UtcDateTime
                : null;
            owned.LastSyncedUtc = now;
        }

        // Whatever is left was owned last sync but not now (refunds, removed licences).
        // Their backlog entries are kept, so the config returns if the game does.
        db.OwnedGames.RemoveRange(existing.Values);
    }
}
