using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Infrastructure.BackgroundJobs;

/// <summary>
/// Runs enrichment shortly after startup, then every RunIntervalHours, or sooner when a
/// sync brings in games we've never seen. Runs never overlap. Because it also runs at
/// startup, a Mac that was off at the scheduled time catches up when Sift next starts.
/// </summary>
public sealed class MetadataEnrichmentJob(
    IServiceScopeFactory scopeFactory,
    IEnrichmentTrigger trigger,
    IOptions<EnrichmentOptions> options,
    ILogger<MetadataEnrichmentJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            logger.LogInformation("Metadata enrichment is disabled");
            return;
        }

        try
        {
            await Task.Delay(TimeSpan.FromSeconds(settings.StartupDelaySeconds), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await RunOnceAsync(stoppingToken);
                await WaitForNextRunAsync(TimeSpan.FromHours(settings.RunIntervalHours), stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down.
        }
    }

    private async Task RunOnceAsync(CancellationToken stoppingToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var enrichment = scope.ServiceProvider.GetRequiredService<IGameMetadataEnrichmentService>();

        try
        {
            logger.LogInformation("Metadata enrichment started");
            var result = await enrichment.RunAsync(stoppingToken);
            logger.LogInformation(
                "Metadata enrichment finished: {Reviews} review scores, {TimesToBeat} completion-time lookups",
                result.ReviewScoresUpdated, result.TimesToBeatUpdated);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Metadata enrichment failed; will retry on the next run");
        }
    }

    private async Task WaitForNextRunAsync(TimeSpan interval, CancellationToken stoppingToken)
    {
        using var waitCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        var scheduled = Task.Delay(interval, waitCts.Token);
        var requested = trigger.WaitForRequestAsync(waitCts.Token);

        await Task.WhenAny(scheduled, requested);
        await waitCts.CancelAsync();
        stoppingToken.ThrowIfCancellationRequested();
    }
}
