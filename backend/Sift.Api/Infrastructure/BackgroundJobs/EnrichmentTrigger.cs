using System.Threading.Channels;

namespace Sift.Api.Infrastructure.BackgroundJobs;

/// <summary>Holds at most one pending request; asking again while one is queued is a no-op.</summary>
public sealed class EnrichmentTrigger : IEnrichmentTrigger
{
    private readonly Channel<bool> _requests = Channel.CreateBounded<bool>(
        new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    public void RequestRun() => _requests.Writer.TryWrite(true);

    public async Task WaitForRequestAsync(CancellationToken cancellationToken) =>
        await _requests.Reader.ReadAsync(cancellationToken);
}
