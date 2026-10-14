using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface IWishlistService
{
    /// <summary>Live from Steam; doesn't need the profile to have been synced. Empty when private.</summary>
    Task<IReadOnlyList<WishlistItemResponse>> GetAsync(string steamId, CancellationToken cancellationToken);
}
