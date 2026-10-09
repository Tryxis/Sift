using Sift.Api.Exceptions;
using Sift.Api.Integrations.Steam;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Services;

public sealed class SteamIdResolver(ISteamApiClient steamApiClient) : ISteamIdResolver
{
    public async Task<string> ResolveAsync(string identifier, CancellationToken cancellationToken)
    {
        var parsed = SteamIdentifierParser.TryParse(identifier)
            ?? throw new InvalidSteamIdentifierException(identifier);

        if (parsed.Kind == SteamIdentifierKind.SteamId64)
        {
            return parsed.Value;
        }

        return await steamApiClient.ResolveVanityUrlAsync(parsed.Value, cancellationToken)
            ?? throw new SteamProfileNotFoundException(identifier);
    }
}
