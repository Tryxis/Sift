using Sift.Api.Integrations.HowLongToBeat.Models;

namespace Sift.Api.Integrations.HowLongToBeat;

public interface IHowLongToBeatClient
{
    Task<IReadOnlyList<HowLongToBeatGame>> SearchAsync(string title, CancellationToken cancellationToken);
}
