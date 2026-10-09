using System.Net;
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

    private async Task<T> GetAsync<T>(string path, string query, CancellationToken cancellationToken)
        where T : class
    {
        // The key is appended here and nowhere else; the full URL is never logged.
        var requestUri = $"{path}?key={_apiKey}&{query}&format=json";

        HttpResponseMessage response;
        try
        {
            response = await httpClient.GetAsync(requestUri, cancellationToken);
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

        using (response)
        {
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                throw new SteamApiException("Steam rejected the API key. Check the Steam:ApiKey secret.");
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                throw new SteamApiException("Steam is rate limiting requests. Wait a minute and sync again.");
            }

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Steam request to {Path} returned {StatusCode}", path, (int)response.StatusCode);
                throw new SteamApiException($"Steam returned an error ({(int)response.StatusCode}).");
            }

            var envelope = await response.Content.ReadFromJsonAsync<SteamResponseEnvelope<T>>(cancellationToken);
            return envelope?.Response
                ?? throw new SteamApiException("Steam returned a response in an unexpected shape.");
        }
    }
}
