using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface IBacklogService
{
    Task<LibraryGameResponse> UpdateEntryAsync(
        string steamId,
        int appId,
        UpdateBacklogEntryRequest request,
        CancellationToken cancellationToken);
}
