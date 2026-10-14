using Sift.Api.Domain.Enums;

namespace Sift.Api.Contracts.Responses;

/// <summary>One backlog status change. FromStatus is null when the game was first given a status.</summary>
public sealed record StatusChangeResponse(
    long Id,
    int AppId,
    string Name,
    BacklogStatus? FromStatus,
    BacklogStatus ToStatus,
    DateTime ChangedUtc);
