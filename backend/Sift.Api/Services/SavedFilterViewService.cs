using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Exceptions;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

public sealed class SavedFilterViewService(AppDbContext db, TimeProvider timeProvider) : ISavedFilterViewService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> AllowedStatuses =
        // "Completed before" is the pre-status filter name, still found in older saved views.
        ["Backlog", "Playing", "Completed", "CompletedBefore", "Abandoned", "Problem", "NotApplicable", "Completed before"];
    private static readonly HashSet<string> AllowedFilters =
    [
        "hours", "timeToBeat", "reviewScore", "finishedHours",
        "reviewCount", "daysSincePlayed", "progress", "recentHours", "achievements", "releaseYear"
    ];
    private static readonly HashSet<int> AllowedPageSizes = [10, 20, 50, 100];
    private static readonly HashSet<string> AllowedTableSortColumns =
    [
        "name", "status", "hours", "lastPlayed", "reviewScore", "timeToBeat", "finishedHours", "playedBefore",
        "value", "priority", "progress", "recentHours", "reviewCount", "achievements", "releaseYear", "statusChanged"
    ];
    private static readonly HashSet<string> AllowedDeckCompatibility = ["Verified", "Playable", "Unsupported", "Unknown"];
    private const int MaxGenres = 30;
    private const int MaxGenreLength = 60;

    // Unique indexes from SavedFilterViewConfiguration (EF's default names).
    private const string NameIndex = "IX_saved_filter_views_SteamId_Name";
    private const string SelectedIndex = "IX_saved_filter_views_SteamId";

    public async Task<IReadOnlyList<SavedFilterViewResponse>> GetAsync(
        string steamId,
        CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);
        var views = await db.SavedFilterViews.AsNoTracking()
            .Where(view => view.SteamId == steamId)
            .OrderBy(view => view.Name)
            .ToListAsync(cancellationToken);
        return views.Select(ToResponse).ToArray();
    }

    public async Task<SavedFilterViewResponse> CreateAsync(
        string steamId,
        SaveFilterViewRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);
        Validate(request);

        return await RunInTransactionAsync(request.Name, async () =>
        {
            await EnsureNameAvailableAsync(steamId, request.Name, null, cancellationToken);

            var previouslySelected = await db.SavedFilterViews
                .Where(view => view.SteamId == steamId && view.IsSelected)
                .ToListAsync(cancellationToken);
            foreach (var previouslySelectedView in previouslySelected)
            {
                previouslySelectedView.IsSelected = false;
            }
            if (previouslySelected.Count > 0)
            {
                // Flushed first: the one-selected-view index is checked per statement.
                await db.SaveChangesAsync(cancellationToken);
            }

            var view = new SavedFilterView
            {
                Id = Guid.NewGuid(),
                SteamId = steamId,
                Name = request.Name.Trim(),
                Configuration = JsonSerializer.Serialize(request.Configuration, JsonOptions),
                IsSelected = true,
                UpdatedUtc = timeProvider.GetUtcNow().UtcDateTime,
            };
            db.SavedFilterViews.Add(view);
            await db.SaveChangesAsync(cancellationToken);
            return ToResponse(view);
        }, cancellationToken);
    }

    public async Task<SavedFilterViewResponse> UpdateAsync(
        string steamId,
        Guid id,
        SaveFilterViewRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);
        Validate(request);
        var view = await db.SavedFilterViews
            .FirstOrDefaultAsync(item => item.SteamId == steamId && item.Id == id, cancellationToken)
            ?? throw new SavedFilterViewNotFoundException(id);
        await EnsureNameAvailableAsync(steamId, request.Name, id, cancellationToken);

        view.Name = request.Name.Trim();
        view.Configuration = JsonSerializer.Serialize(request.Configuration, JsonOptions);
        view.UpdatedUtc = timeProvider.GetUtcNow().UtcDateTime;
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation(NameIndex))
        {
            throw new SavedFilterViewNameConflictException(request.Name.Trim());
        }
        return ToResponse(view);
    }

    public async Task<IReadOnlyList<SavedFilterViewResponse>> SelectAsync(
        string steamId,
        Guid? id,
        CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);

        return await RunInTransactionAsync<IReadOnlyList<SavedFilterViewResponse>>(null, async () =>
        {
            var views = await db.SavedFilterViews
                .Where(view => view.SteamId == steamId)
                .ToListAsync(cancellationToken);
            if (id.HasValue && views.All(view => view.Id != id.Value))
            {
                throw new SavedFilterViewNotFoundException(id.Value);
            }

            foreach (var view in views)
            {
                view.IsSelected = false;
            }
            // Flushed first: the one-selected-view index is checked per statement.
            await db.SaveChangesAsync(cancellationToken);
            if (id.HasValue)
            {
                var selected = views.Single(view => view.Id == id.Value);
                selected.IsSelected = true;
                selected.UpdatedUtc = timeProvider.GetUtcNow().UtcDateTime;
                await db.SaveChangesAsync(cancellationToken);
            }
            return views.OrderBy(view => view.Name).Select(ToResponse).ToArray();
        }, cancellationToken);
    }

    public async Task DeleteAsync(string steamId, Guid id, CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);
        var view = await db.SavedFilterViews
            .FirstOrDefaultAsync(item => item.SteamId == steamId && item.Id == id, cancellationToken)
            ?? throw new SavedFilterViewNotFoundException(id);
        db.SavedFilterViews.Remove(view);
        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Runs a multi-save operation atomically. It goes through the execution strategy because
    /// EnableRetryOnFailure doesn't allow user transactions otherwise, and the change tracker is
    /// cleared first so a retried attempt starts clean. Losing the one-selected-view race to a
    /// concurrent request retries once; a duplicate name becomes the usual 409.
    /// </summary>
    private async Task<T> RunInTransactionAsync<T>(
        string? name,
        Func<Task<T>> work,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
                {
                    db.ChangeTracker.Clear();
                    await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
                    var result = await work();
                    await transaction.CommitAsync(cancellationToken);
                    return result;
                });
            }
            catch (DbUpdateException ex) when (name is not null && ex.IsUniqueViolation(NameIndex))
            {
                db.ChangeTracker.Clear();
                throw new SavedFilterViewNameConflictException(name.Trim());
            }
            catch (DbUpdateException ex) when (ex.IsUniqueViolation(SelectedIndex))
            {
                db.ChangeTracker.Clear();
                if (attempt >= 2)
                {
                    throw new ConcurrentUpdateException(
                        "Saved views were changed by another request at the same time. Try again.", ex);
                }
            }
        }
    }

    private async Task EnsureProfileExistsAsync(string steamId, CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(steamId);
        if (!await db.Profiles.AnyAsync(profile => profile.SteamId == steamId, cancellationToken))
        {
            throw new ProfileNotSyncedException(steamId);
        }
    }

    private async Task EnsureNameAvailableAsync(
        string steamId,
        string name,
        Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        if (await db.SavedFilterViews.AnyAsync(
                view => view.SteamId == steamId &&
                        view.Id != excludeId &&
                        view.Name.ToLower() == normalized,
                cancellationToken))
        {
            throw new SavedFilterViewNameConflictException(name.Trim());
        }
    }

    private static void Validate(SaveFilterViewRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 80)
        {
            throw new InvalidSavedFilterViewException("View name must contain between 1 and 80 characters.");
        }

        var configuration = request.Configuration;
        if (configuration is null ||
            configuration.SelectedStatuses is null ||
            configuration.ActiveFilters is null ||
            configuration.SearchQuery is null ||
            configuration.SearchQuery.Length > 200)
        {
            throw new InvalidSavedFilterViewException("The filter configuration is incomplete or too large.");
        }

        if (configuration.SelectedStatuses.Any(status => !AllowedStatuses.Contains(status)))
        {
            throw new InvalidSavedFilterViewException("The configuration contains an unsupported status.");
        }

        if (configuration.ExcludedStatuses is not null &&
            configuration.ExcludedStatuses.Any(status => status is null || !AllowedStatuses.Contains(status)))
        {
            throw new InvalidSavedFilterViewException("The configuration excludes an unsupported status.");
        }

        if (configuration.ActiveFilters.Keys.Any(key => !AllowedFilters.Contains(key)))
        {
            throw new InvalidSavedFilterViewException("The configuration contains an unsupported filter.");
        }

        if (configuration.ReviewScoreOrder is not (null or "ascending" or "descending"))
        {
            throw new InvalidSavedFilterViewException("Review score order must be ascending, descending, or unset.");
        }

        if (configuration.TableSortColumn is not null && !AllowedTableSortColumns.Contains(configuration.TableSortColumn))
        {
            throw new InvalidSavedFilterViewException("The table sort column is unsupported.");
        }
        if (configuration.TableSortDirection is not (null or "ascending" or "descending"))
        {
            throw new InvalidSavedFilterViewException("Table sort direction must be ascending, descending, or unset.");
        }

        if (configuration.Genres is not null &&
            (configuration.Genres.Count > MaxGenres ||
             configuration.Genres.Any(genre => string.IsNullOrWhiteSpace(genre) || genre.Length > MaxGenreLength)))
        {
            throw new InvalidSavedFilterViewException(
                $"Genres must be at most {MaxGenres} non-empty names of up to {MaxGenreLength} characters each.");
        }

        if (configuration.DeckCompatibility is not null &&
            configuration.DeckCompatibility.Any(value => value is null || !AllowedDeckCompatibility.Contains(value)))
        {
            throw new InvalidSavedFilterViewException(
                "Steam Deck compatibility must be Verified, Playable, Unsupported, or Unknown.");
        }

        if (!AllowedPageSizes.Contains(configuration.PageSize))
        {
            throw new InvalidSavedFilterViewException("Page size must be 10, 20, 50, or 100.");
        }

        foreach (var range in configuration.ActiveFilters.Values)
        {
            if (range is null)
            {
                throw new InvalidSavedFilterViewException("Filter ranges must include minimum and maximum values.");
            }
            ValidateBound(range.Min);
            ValidateBound(range.Max);
        }
    }

    private static void ValidateBound(string? value)
    {
        if (!string.IsNullOrWhiteSpace(value) &&
            (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var bound) || bound < 0))
        {
            throw new InvalidSavedFilterViewException("Filter bounds must be non-negative numbers.");
        }
    }

    private static SavedFilterViewResponse ToResponse(SavedFilterView view)
    {
        var configuration = JsonSerializer.Deserialize<SavedFilterConfiguration>(view.Configuration, JsonOptions)
            ?? throw new InvalidOperationException($"Saved filter view '{view.Id}' has invalid configuration JSON.");
        return new SavedFilterViewResponse(view.Id, view.Name, configuration, view.IsSelected, view.UpdatedUtc);
    }
}
