using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Exceptions;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

public sealed class FavouriteProfileService(AppDbContext db, TimeProvider timeProvider) : IFavouriteProfileService
{
    public async Task<IReadOnlyList<FavouriteProfileResponse>> GetAsync(
        string ownerSteamId,
        CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(ownerSteamId);
        var favourites = await db.FavouriteProfiles.AsNoTracking()
            .Where(favourite => favourite.OwnerSteamId == ownerSteamId)
            .Select(favourite => new FavouriteProfileResponse(
                favourite.SteamId,
                favourite.Alias,
                favourite.Profile.PersonaName,
                favourite.Profile.AvatarUrl,
                favourite.AddedUtc))
            .ToListAsync(cancellationToken);
        return favourites
            .OrderBy(favourite => favourite.Alias ?? favourite.PersonaName, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    /// <summary>Adds the profile, or renames it if it's already a favourite.</summary>
    public async Task<FavouriteProfileResponse> SaveAsync(
        string ownerSteamId,
        string steamId,
        string? alias,
        CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(ownerSteamId);
        SteamIdGuard.EnsureSteamId64(steamId);
        if (steamId == ownerSteamId)
        {
            throw new InvalidFavouriteException("You can't favourite your own profile.");
        }
        var trimmedAlias = string.IsNullOrWhiteSpace(alias) ? null : alias.Trim();
        if (trimmedAlias?.Length > FavouriteProfile.AliasMaxLength)
        {
            throw new InvalidFavouriteException($"An alias can be at most {FavouriteProfile.AliasMaxLength} characters.");
        }

        // Both profiles must have been synced: the owner by signing in, the favourite by being looked up.
        var profiles = await db.Profiles.AsNoTracking()
            .Where(profile => profile.SteamId == ownerSteamId || profile.SteamId == steamId)
            .ToDictionaryAsync(profile => profile.SteamId, cancellationToken);
        if (!profiles.ContainsKey(ownerSteamId)) throw new ProfileNotSyncedException(ownerSteamId);
        if (!profiles.TryGetValue(steamId, out var profile)) throw new ProfileNotSyncedException(steamId);

        var favourite = await db.FavouriteProfiles
            .FirstOrDefaultAsync(item => item.OwnerSteamId == ownerSteamId && item.SteamId == steamId, cancellationToken);
        if (favourite is null)
        {
            if (await db.FavouriteProfiles.CountAsync(item => item.OwnerSteamId == ownerSteamId, cancellationToken)
                >= FavouriteProfile.MaxPerOwner)
            {
                throw new InvalidFavouriteException(
                    $"You can keep up to {FavouriteProfile.MaxPerOwner} favourites. Remove one to add another.");
            }
            favourite = new FavouriteProfile
            {
                OwnerSteamId = ownerSteamId,
                SteamId = steamId,
                AddedUtc = timeProvider.GetUtcNow().UtcDateTime,
            };
            db.FavouriteProfiles.Add(favourite);
        }
        favourite.Alias = trimmedAlias;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            // Another request added the same favourite first; the result is the same.
            db.ChangeTracker.Clear();
            return await SaveAsync(ownerSteamId, steamId, alias, cancellationToken);
        }

        return new FavouriteProfileResponse(steamId, favourite.Alias, profile.PersonaName, profile.AvatarUrl, favourite.AddedUtc);
    }

    /// <summary>Removing a profile that isn't a favourite is a no-op, so a repeated click can't fail.</summary>
    public async Task DeleteAsync(string ownerSteamId, string steamId, CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(ownerSteamId);
        SteamIdGuard.EnsureSteamId64(steamId);
        var favourite = await db.FavouriteProfiles
            .FirstOrDefaultAsync(item => item.OwnerSteamId == ownerSteamId && item.SteamId == steamId, cancellationToken);
        if (favourite is null) return;
        db.FavouriteProfiles.Remove(favourite);
        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Favourites' public notes on one game, newest first. Private notes never leave this query,
    /// matching what anyone viewing those libraries would see.
    /// </summary>
    public async Task<IReadOnlyList<FavouriteNoteResponse>> GetNotesAsync(
        string ownerSteamId,
        int appId,
        CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(ownerSteamId);
        return await (
                from favourite in db.FavouriteProfiles.AsNoTracking()
                where favourite.OwnerSteamId == ownerSteamId
                join entry in db.BacklogEntries.AsNoTracking() on favourite.SteamId equals entry.SteamId
                where entry.AppId == appId && !entry.NotesPrivate && entry.Notes != null && entry.Notes != ""
                orderby entry.UpdatedUtc descending
                select new FavouriteNoteResponse(
                    favourite.SteamId,
                    favourite.Alias,
                    favourite.Profile.PersonaName,
                    favourite.Profile.AvatarUrl,
                    entry.Notes!,
                    entry.Status,
                    db.OwnedGames
                        .Where(owned => owned.SteamId == favourite.SteamId && owned.AppId == appId)
                        .Select(owned => owned.PlaytimeForeverMinutes)
                        .FirstOrDefault(),
                    entry.UpdatedUtc))
            .ToListAsync(cancellationToken);
    }
}
