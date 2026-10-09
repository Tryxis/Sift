using Sift.Api.Integrations.Steam.Models;

namespace Sift.Api.Integrations.Steam;

/// <summary>Thin, typed wrapper over the Steam Web API. No persistence, no business rules.</summary>
public interface ISteamApiClient
{
    Task<string?> ResolveVanityUrlAsync(string vanityName, CancellationToken cancellationToken);

    Task<SteamPlayerSummary?> GetPlayerSummaryAsync(string steamId, CancellationToken cancellationToken);

    Task<SteamOwnedGamesResult> GetOwnedGamesAsync(string steamId, CancellationToken cancellationToken);
}
