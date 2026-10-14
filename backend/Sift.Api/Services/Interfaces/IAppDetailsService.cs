using Sift.Api.Contracts.Responses;
using Sift.Api.Services.Results;

namespace Sift.Api.Services.Interfaces;

public interface IAppDetailsService
{
    /// <summary>Never fails on Steam errors: missing data comes back empty or null.</summary>
    Task<AppDetailsResponse> GetAsync(int appId, CancellationToken cancellationToken);

    /// <summary>Fetches from Steam now and stores the result, for the enrichment job.</summary>
    Task<StoreDetailsRefreshOutcome> RefreshStoredAsync(int appId, CancellationToken cancellationToken);
}
