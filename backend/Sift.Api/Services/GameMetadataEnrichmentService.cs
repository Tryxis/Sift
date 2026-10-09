using Sift.Api.Services.Interfaces;
using Sift.Api.Services.Results;

namespace Sift.Api.Services;

/// <summary>Runs each enrichment source in turn: Steam review scores (official, fast) then HowLongToBeat.</summary>
public sealed class GameMetadataEnrichmentService(
    IReviewScoreService reviewScoreService,
    IHowLongToBeatService howLongToBeatService) : IGameMetadataEnrichmentService
{
    public async Task<EnrichmentRunResult> RunAsync(CancellationToken cancellationToken)
    {
        var reviews = await reviewScoreService.RefreshStaleAsync(cancellationToken);
        var timesToBeat = await howLongToBeatService.RefreshStaleAsync(cancellationToken);
        return new EnrichmentRunResult(reviews, timesToBeat);
    }
}
