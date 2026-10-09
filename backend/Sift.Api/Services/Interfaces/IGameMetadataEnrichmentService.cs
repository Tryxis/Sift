using Sift.Api.Services.Results;

namespace Sift.Api.Services.Interfaces;

public interface IGameMetadataEnrichmentService
{
    Task<EnrichmentRunResult> RunAsync(CancellationToken cancellationToken);
}
