using Sift.Api.Contracts.Requests;

namespace Sift.Api.Contracts.Responses;

public sealed record SavedFilterViewResponse(
    Guid Id,
    string Name,
    SavedFilterConfiguration Configuration,
    bool IsSelected,
    DateTime UpdatedUtc);
