namespace Sift.Api.Contracts.Responses;

/// <summary>When Available is false, Reason says why in words the frontend can show as-is.</summary>
public sealed record AchievementSummaryResponse(
    int AppId,
    bool Available,
    int Total,
    int Unlocked,
    double? Percent,
    string? Reason);
