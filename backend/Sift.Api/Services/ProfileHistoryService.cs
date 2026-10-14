using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Exceptions;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

/// <summary>Read-only views over status_changes and playtime_snapshots.</summary>
public sealed class ProfileHistoryService(AppDbContext db, TimeProvider timeProvider) : IProfileHistoryService
{
    private const int TopGamesPerMonth = 10;

    public async Task<IReadOnlyList<StatusChangeResponse>> GetStatusHistoryAsync(
        string steamId, int limit, CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);

        return await db.StatusChanges
            .AsNoTracking()
            .Where(c => c.SteamId == steamId)
            .OrderByDescending(c => c.ChangedUtc)
            .ThenByDescending(c => c.Id)
            .Take(limit)
            .Select(c => new StatusChangeResponse(c.Id, c.AppId, c.App.Name, c.FromStatus, c.ToStatus, c.ChangedUtc))
            .ToListAsync(cancellationToken);
    }

    /// <remarks>
    /// A game's minutes in a month = its last snapshot in that month minus its last snapshot
    /// before that month, floored at zero. A game's very first snapshot is only a baseline (we
    /// can't know when that playtime happened), so it contributes nothing on its own.
    /// </remarks>
    public async Task<IReadOnlyList<MonthlyPlaytimeResponse>> GetMonthlyPlaytimeAsync(
        string steamId, int months, CancellationToken cancellationToken)
    {
        await EnsureProfileExistsAsync(steamId, cancellationToken);

        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var rangeStart = new DateOnly(today.Year, today.Month, 1).AddMonths(-(months - 1));

        // Every snapshot in range, plus each game's last snapshot before it (its carried-in baseline).
        var snapshots = await db.PlaytimeSnapshots
            .AsNoTracking()
            .Where(s => s.SteamId == steamId
                        && (s.CapturedOn >= rangeStart
                            || !db.PlaytimeSnapshots.Any(later => later.SteamId == s.SteamId
                                                                  && later.AppId == s.AppId
                                                                  && later.CapturedOn > s.CapturedOn
                                                                  && later.CapturedOn < rangeStart)))
            .Select(s => new { s.AppId, s.CapturedOn, s.PlaytimeForeverMinutes })
            .ToListAsync(cancellationToken);

        // (month index from rangeStart, appId) -> minutes
        var perMonth = new Dictionary<int, Dictionary<int, int>>();

        foreach (var game in snapshots.GroupBy(s => s.AppId))
        {
            int? carried = null;
            foreach (var month in game
                         .GroupBy(s => MonthIndex(rangeStart, s.CapturedOn))
                         .OrderBy(m => m.Key))
            {
                var ordered = month.OrderBy(s => s.CapturedOn).ToList();
                var last = ordered[^1].PlaytimeForeverMinutes;
                var baseline = carried ?? ordered[0].PlaytimeForeverMinutes;
                carried = last;

                var minutes = Math.Max(0, last - baseline);
                if (month.Key < 0 || minutes == 0)
                {
                    continue;
                }

                if (!perMonth.TryGetValue(month.Key, out var games))
                {
                    perMonth[month.Key] = games = new Dictionary<int, int>();
                }
                games[game.Key] = minutes;
            }
        }

        var topAppIds = perMonth.Values
            .SelectMany(games => games.OrderByDescending(g => g.Value).ThenBy(g => g.Key).Take(TopGamesPerMonth))
            .Select(g => g.Key)
            .Distinct()
            .ToList();
        var names = await db.Apps
            .AsNoTracking()
            .Where(a => topAppIds.Contains(a.AppId))
            .ToDictionaryAsync(a => a.AppId, a => a.Name, cancellationToken);

        var result = new List<MonthlyPlaytimeResponse>(months);
        for (var index = 0; index < months; index++)
        {
            var monthStart = rangeStart.AddMonths(index);
            var label = monthStart.ToString("yyyy-MM", CultureInfo.InvariantCulture);

            if (!perMonth.TryGetValue(index, out var games))
            {
                result.Add(new MonthlyPlaytimeResponse(label, 0, []));
                continue;
            }

            var top = games
                .OrderByDescending(g => g.Value)
                .ThenBy(g => g.Key)
                .Take(TopGamesPerMonth)
                .Select(g => new MonthlyPlaytimeGameResponse(
                    g.Key, names.GetValueOrDefault(g.Key) ?? $"App {g.Key}", g.Value))
                .ToList();
            result.Add(new MonthlyPlaytimeResponse(label, games.Values.Sum(), top));
        }

        return result;
    }

    /// <summary>Months between rangeStart's month and the date's month; negative before the range.</summary>
    private static int MonthIndex(DateOnly rangeStart, DateOnly date) =>
        (date.Year - rangeStart.Year) * 12 + date.Month - rangeStart.Month;

    private async Task EnsureProfileExistsAsync(string steamId, CancellationToken cancellationToken)
    {
        SteamIdGuard.EnsureSteamId64(steamId);
        if (!await db.Profiles.AnyAsync(p => p.SteamId == steamId, cancellationToken))
        {
            throw new ProfileNotSyncedException(steamId);
        }
    }
}
