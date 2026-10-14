namespace Sift.Api.Services.Interfaces;

public interface IStoreDetailsEnrichmentService
{
    /// <summary>Stores details for owned apps that have none or whose details are stale. Returns how many were stored.</summary>
    Task<int> RefreshStaleAsync(CancellationToken cancellationToken);
}
