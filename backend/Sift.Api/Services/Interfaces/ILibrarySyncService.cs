using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface ILibrarySyncService
{
    /// <summary>Pulls a profile's live library from Steam, stores it, and returns the merged result.</summary>
    Task<LibraryResponse> SyncAsync(string identifier, string? viewerSteamId, CancellationToken cancellationToken);
}
