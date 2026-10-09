namespace Sift.Api.Services.Interfaces;

public interface IHowLongToBeatService
{
    /// <summary>Refreshes completion times that are missing or stale. Returns how many apps were checked.</summary>
    Task<int> RefreshStaleAsync(CancellationToken cancellationToken);
}
