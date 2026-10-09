using System.ComponentModel.DataAnnotations;
using Sift.Api.Domain.Entities;
using Sift.Api.Domain.Enums;

namespace Sift.Api.Contracts.Requests;

/// <summary>
/// Partial update: any property left null is unchanged.
/// Priority 0 clears the priority; an empty Notes string clears the notes.
/// </summary>
public sealed record UpdateBacklogEntryRequest
{
    public BacklogStatus? Status { get; init; }

    [Range(0, 9999)]
    public int? Priority { get; init; }

    [MaxLength(BacklogEntry.NotesMaxLength)]
    public string? Notes { get; init; }

    public bool? PlayedBefore { get; init; }

    [Range(typeof(decimal), "0", "1000000")]
    public decimal? FinishedHours { get; init; }

    public bool ClearFinishedHours { get; init; }
}
