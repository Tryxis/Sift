using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface ITimeToBeatLookupService
{
    /// <summary>
    /// Stored completion times when Sift has them, otherwise an on-demand HowLongToBeat search by name.
    /// Read-only: nothing is written to the database.
    /// </summary>
    Task<TimeToBeatResponse> GetAsync(int appId, string steamName, CancellationToken cancellationToken);
}
