using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Sift.Api.Integrations.HowLongToBeat.Models;

namespace Sift.Api.Integrations.HowLongToBeat;

/// <summary>
/// Searches HowLongToBeat the way its own website does. There is no official API, so this
/// mirrors the flow used by the actively maintained community client (howlongtobeatpy):
///   1. find the search endpoint in the site's JavaScript (it moves between releases),
///   2. GET {endpoint}/init?t=... for a token and a key/value pair,
///   3. POST the search with those as headers (and the pair in the body).
/// This is the one file to update when HowLongToBeat changes its site.
///
/// Registered as a singleton so the discovered endpoint and token are reused across searches.
/// </summary>
public sealed partial class HowLongToBeatClient(
    IHttpClientFactory httpClientFactory,
    ILogger<HowLongToBeatClient> logger) : IHowLongToBeatClient
{
    public const string HttpClientName = "HowLongToBeat";

    private const string FallbackSearchPath = "api/s";
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromMinutes(10);

    private readonly SemaphoreSlim _sessionLock = new(1, 1);
    private HowLongToBeatSession? _session;

    [GeneratedRegex(@"src=""(/_next/static/chunks/[^""]+\.js)""")]
    private static partial Regex ChunkScriptPattern();

    [GeneratedRegex(@"fetch\s*\(\s*[""']/api/([a-zA-Z0-9_/]+)[^""']*[""']\s*,\s*\{[^}]*method:\s*[""']POST[""'][^}]*\}")]
    private static partial Regex SearchEndpointPattern();

    public async Task<IReadOnlyList<HowLongToBeatGame>> SearchAsync(string title, CancellationToken cancellationToken)
    {
        var http = httpClientFactory.CreateClient(HttpClientName);

        var session = await GetSessionAsync(http, forceRefresh: false, cancellationToken);
        var response = await SendSearchAsync(http, session, title, cancellationToken);

        // Tokens expire or get rotated; refresh once and retry before giving up.
        if (response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized or HttpStatusCode.NotFound)
        {
            response.Dispose();
            session = await GetSessionAsync(http, forceRefresh: true, cancellationToken);
            response = await SendSearchAsync(http, session, title, cancellationToken);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw new HowLongToBeatException($"Search returned {(int)response.StatusCode}.");
            }

            try
            {
                var result = await response.Content.ReadFromJsonAsync<HowLongToBeatSearchResponse>(cancellationToken);
                return result?.Data ?? [];
            }
            catch (JsonException ex)
            {
                throw new HowLongToBeatException("Search response wasn't in the expected shape.", ex);
            }
        }
    }

    private async Task<HttpResponseMessage> SendSearchAsync(
        HttpClient http, HowLongToBeatSession session, string title, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, session.SearchPath)
        {
            Content = new StringContent(BuildSearchPayload(title, session).ToJsonString(), Encoding.UTF8, "application/json")
        };

        if (session.Token is not null) request.Headers.TryAddWithoutValidation("x-auth-token", session.Token);
        if (session.HoneypotKey is not null) request.Headers.TryAddWithoutValidation("x-hp-key", session.HoneypotKey);
        if (session.HoneypotValue is not null) request.Headers.TryAddWithoutValidation("x-hp-val", session.HoneypotValue);

        try
        {
            return await http.SendAsync(request, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException
                                   || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            throw new HowLongToBeatException("HowLongToBeat could not be reached.", ex);
        }
    }

    private static JsonObject BuildSearchPayload(string title, HowLongToBeatSession session)
    {
        var payload = new JsonObject
        {
            ["searchType"] = "games",
            ["searchTerms"] = new JsonArray(title.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(term => (JsonNode)JsonValue.Create(term)!).ToArray()),
            ["searchPage"] = 1,
            ["size"] = 20,
            ["searchOptions"] = new JsonObject
            {
                ["games"] = new JsonObject
                {
                    ["userId"] = 0,
                    ["platform"] = "",
                    ["sortCategory"] = "popular",
                    ["rangeCategory"] = "main",
                    ["rangeTime"] = new JsonObject { ["min"] = 0, ["max"] = 0 },
                    ["gameplay"] = new JsonObject { ["perspective"] = "", ["flow"] = "", ["genre"] = "", ["difficulty"] = "" },
                    ["rangeYear"] = new JsonObject { ["max"] = "", ["min"] = "" },
                    ["modifier"] = "hide_dlc"
                },
                ["users"] = new JsonObject { ["sortCategory"] = "postcount" },
                ["lists"] = new JsonObject { ["sortCategory"] = "follows" },
                ["filter"] = "",
                ["sort"] = 0,
                ["randomizer"] = 0
            },
            ["useCache"] = true
        };

        if (session.HoneypotKey is not null)
        {
            payload[session.HoneypotKey] = session.HoneypotValue;
        }

        return payload;
    }

    private async Task<HowLongToBeatSession> GetSessionAsync(
        HttpClient http, bool forceRefresh, CancellationToken cancellationToken)
    {
        await _sessionLock.WaitAsync(cancellationToken);
        try
        {
            if (!forceRefresh && _session is not null && DateTime.UtcNow - _session.IssuedUtc < SessionLifetime)
            {
                return _session;
            }

            var searchPath = forceRefresh || _session is null
                ? await DiscoverSearchPathAsync(http, cancellationToken)
                : _session.SearchPath;

            _session = await RequestTokenAsync(http, searchPath, cancellationToken);
            return _session;
        }
        finally
        {
            _sessionLock.Release();
        }
    }

    private async Task<string> DiscoverSearchPathAsync(HttpClient http, CancellationToken cancellationToken)
    {
        try
        {
            var homepage = await http.GetStringAsync("", cancellationToken);
            foreach (Match script in ChunkScriptPattern().Matches(homepage))
            {
                var source = await http.GetStringAsync(script.Groups[1].Value.TrimStart('/'), cancellationToken);
                var endpoint = SearchEndpointPattern().Match(source);
                if (endpoint.Success)
                {
                    var path = $"api/{endpoint.Groups[1].Value}";
                    logger.LogInformation("HowLongToBeat search endpoint discovered at /{Path}", path);
                    return path;
                }
            }
        }
        catch (Exception ex) when (ex is HttpRequestException
                                   || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning(ex, "Couldn't read HowLongToBeat's scripts; using the default search endpoint");
        }

        return FallbackSearchPath;
    }

    private static async Task<HowLongToBeatSession> RequestTokenAsync(
        HttpClient http, string searchPath, CancellationToken cancellationToken)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        try
        {
            using var document = JsonDocument.Parse(
                await http.GetStringAsync($"{searchPath}/init?t={timestamp}", cancellationToken));

            string? token = null, key = null, value = null;
            foreach (var property in document.RootElement.EnumerateObject())
            {
                var name = property.Name.ToLowerInvariant();
                var text = property.Value.ValueKind == JsonValueKind.String
                    ? property.Value.GetString()
                    : property.Value.GetRawText();

                if (name == "token") token = text;
                else if (name.Contains("key")) key = text;
                else if (name.Contains("val")) value = text;
            }

            return new HowLongToBeatSession(searchPath, token, key, value, DateTime.UtcNow);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException
                                   || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            throw new HowLongToBeatException("Couldn't get a search token from HowLongToBeat.", ex);
        }
    }
}
