using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface ILibraryQueryService
{
    /// <summary>Reads the stored library without calling Steam.</summary>
    Task<LibraryResponse> GetLibraryAsync(string steamId, CancellationToken cancellationToken);
}
