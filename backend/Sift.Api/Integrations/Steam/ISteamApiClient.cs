using Sift.Api.Integrations.Steam.Models;

namespace Sift.Api.Integrations.Steam;

/// <summary>Thin, typed wrapper over the Steam Web API. No persistence, no business rules.</summary>
public interface ISteamApiClient
{
    Task<string?> ResolveVanityUrlAsync(string vanityName, CancellationToken cancellationToken);

    Task<SteamPlayerSummary?> GetPlayerSummaryAsync(string steamId, CancellationToken cancellationToken);

    Task<SteamOwnedGamesResult> GetOwnedGamesAsync(string steamId, CancellationToken cancellationToken);

    /// <summary>Never throws for Steam-side failures; the outcome says what went wrong.</summary>
    Task<SteamAchievementsResult> GetPlayerAchievementsAsync(string steamId, int appId, CancellationToken cancellationToken);

    /// <summary>Empty when the wishlist is empty or private.</summary>
    Task<IReadOnlyList<SteamWishlistItem>> GetWishlistAsync(string steamId, CancellationToken cancellationToken);

    /// <summary>Store metadata (name, release, reviews, price, assets) for up to ~50 apps in one call.</summary>
    Task<IReadOnlyList<SteamStoreItem>> GetStoreItemsAsync(IReadOnlyCollection<int> appIds, CancellationToken cancellationToken);
}
