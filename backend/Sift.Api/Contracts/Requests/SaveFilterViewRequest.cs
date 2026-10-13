using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Contracts.Requests;

public sealed record FilterRange(string? Min, string? Max);

public sealed record SavedFilterConfiguration(
    IReadOnlyList<string> SelectedStatuses,
    Dictionary<string, FilterRange> ActiveFilters,
    bool? PlayedBefore,
    string? ReviewScoreOrder,
    string SearchQuery,
    int PageSize,
    string? TableSortColumn = null,
    string? TableSortDirection = null);

public sealed record SaveFilterViewRequest(
    [Required, StringLength(80, MinimumLength = 1)] string Name,
    [Required] SavedFilterConfiguration Configuration);
