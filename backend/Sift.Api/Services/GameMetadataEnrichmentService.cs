using Sift.Api.Data;
using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;

namespace Sift.Api.Services;

/// <summary>
/// Runs each enrichment source in turn: Steam review scores (official, fast), HowLongToBeat,
/// stored store-page details, then per-profile achievement progress. A source that fails is
/// logged and skipped, so one broken upstream doesn't starve the sources after it.
/// </summary>
public sealed class GameMetadataEnrichmentService(
    IReviewScoreService reviewScoreService,
    IHowLongToBeatService howLongToBeatService,
    IStoreDetailsEnrichmentService storeDetailsEnrichmentService,
    IAchievementEnrichmentService achievementEnrichmentService,
    AppDbContext db,
    ILogger<GameMetadataEnrichmentService> logger) : IGameMetadataEnrichmentService
{
    public async Task<EnrichmentRunResult> RunAsync(CancellationToken cancellationToken)
    {
        var reviews = await RunStepAsync("review scores", reviewScoreService.RefreshStaleAsync, cancellationToken);
        var timesToBeat = await RunStepAsync("HowLongToBeat", howLongToBeatService.RefreshStaleAsync, cancellationToken);
        var storeDetails = await RunStepAsync("store details", storeDetailsEnrichmentService.RefreshStaleAsync, cancellationToken);
        var achievements = await RunStepAsync("achievements", achievementEnrichmentService.RefreshStaleAsync, cancellationToken);
        return new EnrichmentRunResult(reviews, timesToBeat, storeDetails, achievements);
    }

    private async Task<int> RunStepAsync(string name, Func<CancellationToken, Task<int>> step, CancellationToken cancellationToken)
    {
        try
        {
            return await step(cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError(ex, "Enrichment step {Step} failed; continuing with the next one", name);
            // The services share one scoped context; drop whatever the failed step left half-saved.
            db.ChangeTracker.Clear();
            return 0;
        }
    }
}
