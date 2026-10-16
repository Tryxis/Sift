using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface ILibraryQueryService
{
    /// <summary>Reads the stored library without calling Steam, as <paramref name="viewerSteamId"/> may see it.</summary>
    Task<LibraryResponse> GetLibraryAsync(string steamId, string? viewerSteamId, CancellationToken cancellationToken);
}
