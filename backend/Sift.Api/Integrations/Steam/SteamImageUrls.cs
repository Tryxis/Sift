namespace Sift.Api.Integrations.Steam;

/// <summary>Steam's public CDN URL conventions. No API key involved.</summary>
public static class SteamImageUrls
{
    public static string HeaderImage(int appId) =>
        $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg";

    /// <summary>
    /// Builds a store asset URL from IStoreBrowseService's asset_url_format
    /// (e.g. "steam/apps/570/${FILENAME}?t=123"). Newer apps keep their header under a hashed
    /// folder, which the plain HeaderImage URL doesn't know about.
    /// </summary>
    public static string? StoreAsset(string? assetUrlFormat, string? fileName) =>
        string.IsNullOrWhiteSpace(assetUrlFormat) || string.IsNullOrWhiteSpace(fileName)
            ? null
            : "https://shared.akamai.steamstatic.com/store_item_assets/" +
              assetUrlFormat.Replace("${FILENAME}", fileName, StringComparison.Ordinal);

    public static string? Icon(int appId, string? iconHash) =>
        string.IsNullOrWhiteSpace(iconHash)
            ? null
            : $"https://media.steampowered.com/steamcommunity/public/images/apps/{appId}/{iconHash}.jpg";
}
