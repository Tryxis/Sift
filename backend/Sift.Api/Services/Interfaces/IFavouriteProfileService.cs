using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface IFavouriteProfileService
{
    Task<IReadOnlyList<FavouriteProfileResponse>> GetAsync(string ownerSteamId, CancellationToken cancellationToken);
    Task<FavouriteProfileResponse> SaveAsync(string ownerSteamId, string steamId, string? alias, CancellationToken cancellationToken);
    Task DeleteAsync(string ownerSteamId, string steamId, CancellationToken cancellationToken);
    Task<IReadOnlyList<FavouriteNoteResponse>> GetNotesAsync(string ownerSteamId, int appId, CancellationToken cancellationToken);
}
