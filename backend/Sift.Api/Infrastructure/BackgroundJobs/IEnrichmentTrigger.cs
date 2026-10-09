namespace Sift.Api.Infrastructure.BackgroundJobs;

/// <summary>Lets other code ask for an enrichment run sooner than the daily schedule.</summary>
public interface IEnrichmentTrigger
{
    void RequestRun();

    Task WaitForRequestAsync(CancellationToken cancellationToken);
}
