using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Exceptions;
using Sift.Api.Mapping;
using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;

namespace Sift.Api.Services;

/// <summary>
/// The only writer of backlog_entries and status_changes. The ownership check sits in front of
/// this service (the ProfileOwner policy on BacklogController), so it trusts the steamId it's given.
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

        BacklogEntry entry;
        try
        {
            entry = await SaveEntryAsync(steamId, appId, request, cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // A concurrent PATCH created the entry first. Apply this request on top of theirs.
            db.ChangeTracker.Clear();
            try
            {
                entry = await SaveEntryAsync(steamId, appId, request, cancellationToken);
            }
            catch (DbUpdateException retryEx) when (retryEx.IsUniqueViolation())
            {
                throw new ConcurrentUpdateException(
                    "This game's backlog entry was changed by another request at the same time. Try again.", retryEx);
            }
        }

        var timeToBeat = await db.HowLongToBeatEntries.AsNoTracking()
            .FirstOrDefaultAsync(h => h.AppId == appId, cancellationToken);
        var reviews = await db.ReviewSummaries.AsNoTracking()
            .FirstOrDefaultAsync(r => r.AppId == appId, cancellationToken);
        var details = await db.AppDetails.AsNoTracking()
            .Where(d => d.AppId == appId)
            .Select(d => new AppDetailsSummary(d.AppId, d.Genres, d.ReleaseYear, d.DeckCompatibility, d.IsMultiplayer, d.StoreType))
            .FirstOrDefaultAsync(cancellationToken);
        var achievements = await db.AchievementProgress.AsNoTracking()
            .FirstOrDefaultAsync(a => a.SteamId == steamId && a.AppId == appId, cancellationToken);

        // Only the owner gets here (ProfileOwner policy), so private notes are theirs to see.
        return ownedGame.ToLibraryGameResponse(entry, timeToBeat, reviews, details, achievements, viewerIsOwner: true);
    }

    /// <summary>Applies the request and records any status change, all in one SaveChanges.</summary>
    private async Task<BacklogEntry> SaveEntryAsync(
        string steamId,
        int appId,
        UpdateBacklogEntryRequest request,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var entry = await db.BacklogEntries.FindAsync([steamId, appId], cancellationToken);
        var isNew = entry is null;
        if (entry is null)
        {
            entry = new BacklogEntry { SteamId = steamId, AppId = appId };
            db.BacklogEntries.Add(entry);
        }

        if (request.Status is { } status && status != entry.Status)
        {
            db.StatusChanges.Add(new StatusChange
            {
                SteamId = steamId,
                AppId = appId,
                // A brand-new entry had no stored status; it was only implicitly Backlog.
                FromStatus = isNew ? null : entry.Status,
                ToStatus = status,
                ChangedUtc = now
            });
            entry.StatusChangedUtc = now;
        }

        ApplyChanges(entry, request);
        entry.UpdatedUtc = now;

        await db.SaveChangesAsync(cancellationToken);
        return entry;
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

        if (request.NotesPrivate is { } notesPrivate)
        {
            entry.NotesPrivate = notesPrivate;
        }

        if (request.NotInterested is { } notInterested)
        {
            entry.NotInterested = notInterested;
        }
    }
}
