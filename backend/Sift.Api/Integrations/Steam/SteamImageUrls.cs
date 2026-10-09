namespace Sift.Api.Integrations.Steam;

/// <summary>Steam's public CDN URL conventions. No API key involved.</summary>
public static class SteamImageUrls
{
    public static string HeaderImage(int appId) =>
        $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg";

    public static string? Icon(int appId, string? iconHash) =>
        string.IsNullOrWhiteSpace(iconHash)
            ? null
            : $"https://media.steampowered.com/steamcommunity/public/images/apps/{appId}/{iconHash}.jpg";
}
