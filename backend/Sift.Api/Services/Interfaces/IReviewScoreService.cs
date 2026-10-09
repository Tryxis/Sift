namespace Sift.Api.Services.Interfaces;

public interface IReviewScoreService
{
    /// <summary>Refreshes review scores that are missing or stale. Returns how many were updated.</summary>
    Task<int> RefreshStaleAsync(CancellationToken cancellationToken);
}
