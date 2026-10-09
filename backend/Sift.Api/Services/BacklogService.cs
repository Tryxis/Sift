using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Exceptions;
using Sift.Api.Mapping;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>
/// The only writer of backlog_entries. When Steam sign-in lands, the ownership
/// check sits in front of this service (an authorization policy on the controller),
/// so nothing here needs to change.
/// </summary>
public sealed class BacklogService(AppDbContext db, TimeProvider timeProvider) : IBacklogService
{
    public async Task<LibraryGameResponse> UpdateEntryAsync(
        string steamId,
        int appId,
        UpdateBacklogEntryRequest request,
        CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(steamId);

        var ownedGame = await db.OwnedGames
            .AsNoTracking()
            .Include(g => g.App)
            .FirstOrDefaultAsync(g => g.SteamId == steamId && g.AppId == appId, cancellationToken)
            ?? throw new GameNotInLibraryException(steamId, appId);

        var entry = await db.BacklogEntries.FindAsync([steamId, appId], cancellationToken);
        if (entry is null)
        {
            entry = new BacklogEntry { SteamId = steamId, AppId = appId };
            db.BacklogEntries.Add(entry);
        }

        ApplyChanges(entry, request);
        entry.UpdatedUtc = timeProvider.GetUtcNow().UtcDateTime;

        await db.SaveChangesAsync(cancellationToken);

        var timeToBeat = await db.HowLongToBeatEntries.AsNoTracking()
            .FirstOrDefaultAsync(h => h.AppId == appId, cancellationToken);
        var reviews = await db.ReviewSummaries.AsNoTracking()
            .FirstOrDefaultAsync(r => r.AppId == appId, cancellationToken);

        return ownedGame.ToLibraryGameResponse(entry, timeToBeat, reviews);
    }

    private static void ApplyChanges(BacklogEntry entry, UpdateBacklogEntryRequest request)
    {
        if (request.Status is { } status)
        {
            entry.Status = status;
        }

        if (request.Priority is { } priority)
        {
            entry.Priority = priority == 0 ? null : priority;
        }

        if (request.Notes is not null)
        {
            entry.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        }

        if (request.ClearFinishedHours)
        {
            entry.FinishedHours = null;
        }
        else if (request.FinishedHours is { } finishedHours)
        {
            entry.FinishedHours = finishedHours;
        }

        if (request.PlayedBefore is { } playedBefore)
        {
            entry.PlayedBefore = playedBefore;
        }
    }
}
