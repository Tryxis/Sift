namespace Sift.Api.Services.Interfaces;

public interface IAchievementEnrichmentService
{
    /// <summary>Refreshes stored achievement progress for each synced profile's played games. Returns how many were stored.</summary>
    Task<int> RefreshStaleAsync(CancellationToken cancellationToken);
}
