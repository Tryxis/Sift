namespace Sift.Api.Services.Results;

public sealed record EnrichmentRunResult(
    int ReviewScoresUpdated,
    int TimesToBeatUpdated,
    int StoreDetailsUpdated,
    int AchievementsUpdated);
