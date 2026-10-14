using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Exceptions;
using Sift.Api.Mapping;
using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;

namespace Sift.Api.Services;

public sealed class LibraryQueryService(AppDbContext db) : ILibraryQueryService
{
    public async Task<LibraryResponse> GetLibraryAsync(string steamId, CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(steamId);

        var profile = await db.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.SteamId == steamId, cancellationToken)
            ?? throw new ProfileNotSyncedException(steamId);

        var ownedGames = await db.OwnedGames
            .AsNoTracking()
            .Include(g => g.App)
            .Where(g => g.SteamId == steamId)
            .ToListAsync(cancellationToken);

        var appIds = ownedGames.Select(g => g.AppId).ToList();

        var backlogEntries = await db.BacklogEntries
            .AsNoTracking()
            .Where(e => e.SteamId == steamId)
            .ToDictionaryAsync(e => e.AppId, cancellationToken);

        var timesToBeat = await db.HowLongToBeatEntries
            .AsNoTracking()
            .Where(h => appIds.Contains(h.AppId))
            .ToDictionaryAsync(h => h.AppId, cancellationToken);

        var reviews = await db.ReviewSummaries
            .AsNoTracking()
            .Where(r => appIds.Contains(r.AppId))
            .ToDictionaryAsync(r => r.AppId, cancellationToken);

        // Only the columns the list needs; descriptions and long lists stay in the table.
        var details = await db.AppDetails
            .AsNoTracking()
            .Where(d => appIds.Contains(d.AppId))
            .Select(d => new AppDetailsSummary(d.AppId, d.Genres, d.ReleaseYear, d.DeckCompatibility, d.IsMultiplayer, d.StoreType))
            .ToDictionaryAsync(d => d.AppId, cancellationToken);

        var achievements = await db.AchievementProgress
            .AsNoTracking()
            .Where(a => a.SteamId == steamId)
            .ToDictionaryAsync(a => a.AppId, cancellationToken);

        var games = ownedGames
            .Select(g => g.ToLibraryGameResponse(
                backlogEntries.GetValueOrDefault(g.AppId),
                timesToBeat.GetValueOrDefault(g.AppId),
                reviews.GetValueOrDefault(g.AppId),
                details.GetValueOrDefault(g.AppId),
                achievements.GetValueOrDefault(g.AppId)))
            .OrderByDescending(g => g.PlaytimeForeverMinutes)
            .ThenBy(g => g.Name)
            .ToList();

        return new LibraryResponse(profile.ToResponse(games.Count), games);
    }
}
