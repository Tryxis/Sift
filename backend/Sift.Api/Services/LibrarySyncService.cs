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
/// Writes only Steam-owned tables (profiles, apps, owned games, playtime snapshots).
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
    private const int MaxAppNameLength = 256;

    public async Task<LibraryResponse> SyncAsync(string identifier, string? viewerSteamId, CancellationToken cancellationToken)
    {
        var steamId = await steamIdResolver.ResolveAsync(identifier, cancellationToken);

        var summary = await steamApiClient.GetPlayerSummaryAsync(steamId, cancellationToken)
            ?? throw new SteamProfileNotFoundException(identifier);
        var ownedGames = await steamApiClient.GetOwnedGamesAsync(steamId, cancellationToken);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var isLibraryVisible = ownedGames.Games is not null;

        // A private library comes back empty. Treat that as "unknown", not "owns nothing",
        // so going private temporarily doesn't wipe stored games.
        var games = isLibraryVisible
            ? ownedGames.Games!.DistinctBy(g => g.AppId).ToList()
            : null;

        int newAppCount;
        try
        {
            newAppCount = await PersistAsync(summary, games, now, cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // Another sync inserted the same new app, profile or snapshot first. Their rows are
            // committed now, so a second pass sees them and updates instead of inserting.
            logger.LogInformation("Concurrent sync detected for {SteamId}; retrying once", steamId);
            db.ChangeTracker.Clear();
            try
            {
                newAppCount = await PersistAsync(summary, games, now, cancellationToken);
            }
            catch (DbUpdateException retryEx) when (retryEx.IsUniqueViolation())
            {
                throw new ConcurrentUpdateException(
                    "This profile was being synced by another request at the same time. Try again.", retryEx);
            }
        }

        // Games we've never seen have no review score or completion time yet; fetch them
        // soon rather than waiting for tomorrow's run.
        if (newAppCount > 0)
        {
            enrichmentTrigger.RequestRun();
        }

        logger.LogInformation("Synced profile {SteamId}: {GameCount} games, visible={Visible}",
            steamId, ownedGames.Games?.Count ?? 0, isLibraryVisible);

        return await libraryQueryService.GetLibraryAsync(steamId, viewerSteamId, cancellationToken);
    }

    /// <returns>How many apps were new to the database.</returns>
    private async Task<int> PersistAsync(
        SteamPlayerSummary summary,
        IReadOnlyCollection<SteamOwnedGame>? games,
        DateTime now,
        CancellationToken cancellationToken)
    {
        await UpsertProfileAsync(summary, games is not null, now, cancellationToken);

        var newAppCount = 0;
        if (games is not null)
        {
            newAppCount = await UpsertAppsAsync(games, now, cancellationToken);
            await ReplaceOwnedGamesAsync(summary.SteamId, games, now, cancellationToken);
            await CapturePlaytimeSnapshotsAsync(summary.SteamId, games, now, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return newAppCount;
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
        // The frontend shows this as "last synced", so it moves on every sync.
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
            // steam_apps.Name is varchar(256); one over-long name must not fail the whole sync.
            var name = string.IsNullOrWhiteSpace(game.Name) ? $"App {game.AppId}"
                : game.Name.Length > MaxAppNameLength ? game.Name[..MaxAppNameLength] : game.Name;

            if (!existing.TryGetValue(game.AppId, out var app))
            {
                app = new SteamApp { AppId = game.AppId };
                db.Apps.Add(app);
                added++;
            }
            else if (app.Name == name && app.IconHash == game.IconHash)
            {
                // Unchanged: no UPDATE, and LastUpdatedUtc keeps meaning "last changed".
                continue;
            }

            app.Name = name;
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
            var lastPlayedUtc = game.LastPlayedUnixSeconds > 0
                ? DateTimeOffset.FromUnixTimeSeconds(game.LastPlayedUnixSeconds).UtcDateTime
                : (DateTime?)null;

            if (!existing.Remove(game.AppId, out var owned))
            {
                owned = new OwnedGame { SteamId = steamId, AppId = game.AppId };
                db.OwnedGames.Add(owned);
            }
            else if (owned.PlaytimeForeverMinutes == game.PlaytimeForeverMinutes
                     && owned.PlaytimeTwoWeeksMinutes == game.PlaytimeTwoWeeksMinutes
                     && owned.LastPlayedUtc == lastPlayedUtc)
            {
                // Unchanged: no UPDATE, and LastSyncedUtc keeps meaning "last changed by a sync".
                continue;
            }

            owned.PlaytimeForeverMinutes = game.PlaytimeForeverMinutes;
            owned.PlaytimeTwoWeeksMinutes = game.PlaytimeTwoWeeksMinutes;
            owned.LastPlayedUtc = lastPlayedUtc;
            owned.LastSyncedUtc = now;
        }

        // Whatever is left was owned last sync but not now (refunds, removed licences).
        // Their backlog entries are kept, so the config returns if the game does.
        db.OwnedGames.RemoveRange(existing.Values);
    }

    /// <summary>
    /// Records today's lifetime playtime for each game whose value differs from its most recent
    /// snapshot (or that has none). One query for the latest snapshot per game, then the inserts
    /// and updates go out batched with the rest of the sync's SaveChanges.
    /// </summary>
    private async Task CapturePlaytimeSnapshotsAsync(
        string steamId, IReadOnlyCollection<SteamOwnedGame> games, DateTime now, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(now);

        var latest = await db.PlaytimeSnapshots
            .Where(s => s.SteamId == steamId
                        && !db.PlaytimeSnapshots.Any(later => later.SteamId == s.SteamId
                                                              && later.AppId == s.AppId
                                                              && later.CapturedOn > s.CapturedOn))
            .ToDictionaryAsync(s => s.AppId, cancellationToken);

        foreach (var game in games)
        {
            if (latest.TryGetValue(game.AppId, out var snapshot))
            {
                if (snapshot.PlaytimeForeverMinutes == game.PlaytimeForeverMinutes)
                {
                    continue;
                }

                if (snapshot.CapturedOn == today)
                {
                    // Played more since an earlier sync today: today's row tracks the latest value.
                    snapshot.PlaytimeForeverMinutes = game.PlaytimeForeverMinutes;
                    continue;
                }
            }

            db.PlaytimeSnapshots.Add(new PlaytimeSnapshot
            {
                SteamId = steamId,
                AppId = game.AppId,
                CapturedOn = today,
                PlaytimeForeverMinutes = game.PlaytimeForeverMinutes
            });
        }
    }
}
