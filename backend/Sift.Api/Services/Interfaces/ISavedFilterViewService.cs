using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;

namespace Sift.Api.Services.Interfaces;

public interface ISavedFilterViewService
{
    Task<IReadOnlyList<SavedFilterViewResponse>> GetAsync(string steamId, CancellationToken cancellationToken);
    Task<SavedFilterViewResponse> CreateAsync(string steamId, SaveFilterViewRequest request, CancellationToken cancellationToken);
    Task<SavedFilterViewResponse> UpdateAsync(string steamId, Guid id, SaveFilterViewRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<SavedFilterViewResponse>> SelectAsync(string steamId, Guid? id, CancellationToken cancellationToken);
    Task DeleteAsync(string steamId, Guid id, CancellationToken cancellationToken);
}
