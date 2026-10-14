using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface IProfileHistoryService
{
    /// <summary>Backlog status changes, newest first, capped at <paramref name="limit"/>.</summary>
    Task<IReadOnlyList<StatusChangeResponse>> GetStatusHistoryAsync(
        string steamId, int limit, CancellationToken cancellationToken);

    /// <summary>One entry per calendar month (UTC) for the last <paramref name="months"/> months, oldest first.</summary>
    Task<IReadOnlyList<MonthlyPlaytimeResponse>> GetMonthlyPlaytimeAsync(
        string steamId, int months, CancellationToken cancellationToken);
}
