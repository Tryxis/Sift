using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;

namespace Sift.Api.Services;

/// <summary>
/// Runs each enrichment source in turn: Steam review scores (official, fast), HowLongToBeat,
/// stored store-page details, then per-profile achievement progress.
/// </summary>
public sealed class GameMetadataEnrichmentService(
    IReviewScoreService reviewScoreService,
    IHowLongToBeatService howLongToBeatService,
    IStoreDetailsEnrichmentService storeDetailsEnrichmentService,
    IAchievementEnrichmentService achievementEnrichmentService) : IGameMetadataEnrichmentService
{
    public async Task<EnrichmentRunResult> RunAsync(CancellationToken cancellationToken)
    {
        var reviews = await reviewScoreService.RefreshStaleAsync(cancellationToken);
        var timesToBeat = await howLongToBeatService.RefreshStaleAsync(cancellationToken);
        var storeDetails = await storeDetailsEnrichmentService.RefreshStaleAsync(cancellationToken);
        var achievements = await achievementEnrichmentService.RefreshStaleAsync(cancellationToken);
        return new EnrichmentRunResult(reviews, timesToBeat, storeDetails, achievements);
    }
}
