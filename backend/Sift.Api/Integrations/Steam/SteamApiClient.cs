using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Exceptions;
using Sift.Api.Integrations.Steam.Models;

namespace Sift.Api.Integrations.Steam;

public sealed class SteamApiClient(
    HttpClient httpClient,
    IOptions<SteamOptions> options,
    ILogger<SteamApiClient> logger) : ISteamApiClient
{
    private readonly string _apiKey = options.Value.ApiKey;

    public async Task<string?> ResolveVanityUrlAsync(string vanityName, CancellationToken cancellationToken)
    {
        var result = await GetAsync<SteamResolveVanityUrlResult>(
            "ISteamUser/ResolveVanityURL/v1/",
            $"vanityurl={Uri.EscapeDataString(vanityName)}",
            cancellationToken);

        return result.Success == 1 ? result.SteamId : null;
    }

    public async Task<SteamPlayerSummary?> GetPlayerSummaryAsync(string steamId, CancellationToken cancellationToken)
    {
        var result = await GetAsync<SteamPlayerSummariesResult>(
            "ISteamUser/GetPlayerSummaries/v2/",
            $"steamids={steamId}",
            cancellationToken);

        return result.Players.FirstOrDefault();
    }

    public Task<SteamOwnedGamesResult> GetOwnedGamesAsync(string steamId, CancellationToken cancellationToken) =>
        GetAsync<SteamOwnedGamesResult>(
            "IPlayerService/GetOwnedGames/v1/",
            $"steamid={steamId}&include_appinfo=1&include_played_free_games=1",
            cancellationToken);

    public async Task<SteamAchievementsResult> GetPlayerAchievementsAsync(
        string steamId, int appId, CancellationToken cancellationToken)
    {
        const string path = "ISteamUserStats/GetPlayerAchievements/v1/";

        HttpResponseMessage response;
        try
        {
            response = await SendAsync(path, $"steamid={steamId}&appid={appId}", cancellationToken);
        }
        catch (SteamApiException)
        {
            return SteamAchievementsResult.Unavailable(SteamAchievementsOutcome.Failed);
        }

        using (response)
        {
            // Steam answers errors here with a JSON body too (e.g. 400 "Requested app has no stats"),
            // so the body is read whatever the status.
            SteamPlayerStats? stats = null;
            try
            {
                stats = (await response.Content.ReadFromJsonAsync<SteamPlayerStatsEnvelope>(cancellationToken))?.PlayerStats;
            }
            catch (Exception ex) when (ex is JsonException or HttpRequestException or NotSupportedException
                                       || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
            {
                // Not JSON (an HTML error page, say); the status code decides below.
            }

            var error = stats?.Error ?? string.Empty;

            if (response.StatusCode == HttpStatusCode.Forbidden
                || error.Contains("not public", StringComparison.OrdinalIgnoreCase)
                || error.Contains("private", StringComparison.OrdinalIgnoreCase))
            {
                return SteamAchievementsResult.Unavailable(SteamAchievementsOutcome.Private);
            }

            if (error.Contains("no stats", StringComparison.OrdinalIgnoreCase))
            {
                return SteamAchievementsResult.Unavailable(SteamAchievementsOutcome.NoAchievements);
            }

            if (!response.IsSuccessStatusCode || stats is null || !stats.Success)
            {
                logger.LogWarning("Steam request to {Path} returned {StatusCode}", path, (int)response.StatusCode);
                return SteamAchievementsResult.Unavailable(SteamAchievementsOutcome.Failed);
            }

            var achievements = stats.Achievements ?? [];
            return achievements.Count == 0
                ? SteamAchievementsResult.Unavailable(SteamAchievementsOutcome.NoAchievements)
                : new SteamAchievementsResult(
                    SteamAchievementsOutcome.Available,
                    achievements.Count,
                    achievements.Count(a => a.Achieved == 1));
        }
    }

    public async Task<IReadOnlyList<SteamWishlistItem>> GetWishlistAsync(string steamId, CancellationToken cancellationToken)
    {
        const string path = "IWishlistService/GetWishlist/v1/";

        using var response = await SendAsync(path, $"steamid={steamId}", cancellationToken);

        // A private wishlist is an empty wishlist as far as Sift is concerned.
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            return [];
        }

        EnsureSuccess(response, path);
        var result = await ReadEnvelopeAsync<SteamWishlistResult>(response, path, cancellationToken);
        return result.Items ?? [];
    }

    public async Task<IReadOnlyList<SteamStoreItem>> GetStoreItemsAsync(
        IReadOnlyCollection<int> appIds, CancellationToken cancellationToken)
    {
        if (appIds.Count == 0)
        {
            return [];
        }

        var input = new JsonObject
        {
            ["ids"] = new JsonArray(appIds.Select(id => (JsonNode)new JsonObject { ["appid"] = id }).ToArray()),
            ["context"] = new JsonObject { ["language"] = "english", ["country_code"] = "GB" },
            ["data_request"] = new JsonObject
            {
                ["include_basic_info"] = true,
                ["include_release"] = true,
                ["include_reviews"] = true,
                ["include_assets"] = true
            }
        };

        var result = await GetAsync<SteamStoreItemsResult>(
            "IStoreBrowseService/GetItems/v1/",
            $"input_json={Uri.EscapeDataString(input.ToJsonString())}",
            cancellationToken);

        return result.StoreItems ?? [];
    }

    private async Task<T> GetAsync<T>(string path, string query, CancellationToken cancellationToken)
        where T : class
    {
        using var response = await SendAsync(path, query, cancellationToken);

        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            throw new SteamApiException("Steam rejected the API key. Check the Steam:ApiKey secret.");
        }

        EnsureSuccess(response, path);
        return await ReadEnvelopeAsync<T>(response, path, cancellationToken);
    }

    private async Task<HttpResponseMessage> SendAsync(string path, string query, CancellationToken cancellationToken)
    {
        // The key is appended here and nowhere else; the full URL is never logged.
        var requestUri = $"{path}?key={_apiKey}&{query}&format=json";

        try
        {
            return await httpClient.GetAsync(requestUri, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Steam request to {Path} failed", path);
            throw new SteamApiException("Steam could not be reached. Try again shortly.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Steam request to {Path} timed out", path);
            throw new SteamApiException("Steam took too long to respond. Try again shortly.", ex);
        }
    }

    private void EnsureSuccess(HttpResponseMessage response, string path)
    {
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            throw new SteamApiException("Steam is rate limiting requests. Wait a minute and sync again.");
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Steam request to {Path} returned {StatusCode}", path, (int)response.StatusCode);
            throw new SteamApiException($"Steam returned an error ({(int)response.StatusCode}).");
        }
    }

    private async Task<T> ReadEnvelopeAsync<T>(HttpResponseMessage response, string path, CancellationToken cancellationToken)
        where T : class
    {
        SteamResponseEnvelope<T>? envelope;
        try
        {
            envelope = await response.Content.ReadFromJsonAsync<SteamResponseEnvelope<T>>(cancellationToken);
        }
        catch (Exception ex) when (ex is JsonException or HttpRequestException
                                   || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning(ex, "Steam response from {Path} couldn't be read", path);
            throw new SteamApiException("Steam returned a response in an unexpected shape.", ex);
        }

        return envelope?.Response
            ?? throw new SteamApiException("Steam returned a response in an unexpected shape.");
    }
}
