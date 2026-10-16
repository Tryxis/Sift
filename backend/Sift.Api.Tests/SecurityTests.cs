using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Infrastructure.Security;

namespace Sift.Api.Tests;

/// <summary>Cookies, sessions and response headers, as a hosted (non-Development) Sift sends them.</summary>
public sealed class SecurityTests(SiftApiFactory factory) : IClassFixture<SiftApiFactory>
{
    private const string SteamId = "76561198000000001";

    private CookieAuthenticationOptions CookieOptions =>
        factory.Services.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(CookieAuthenticationDefaults.AuthenticationScheme);

    private HttpClient Client() => factory.CreateClient(new() { AllowAutoRedirect = false, HandleCookies = false });

    [Fact]
    public void Session_cookie_is_host_only_secure_http_only_and_lax()
    {
        var cookie = CookieOptions.Cookie;
        Assert.Equal("__Host-sift_session", cookie.Name);
        Assert.Equal(CookieSecurePolicy.Always, cookie.SecurePolicy);
        Assert.True(cookie.HttpOnly);
        Assert.Equal(SameSiteMode.Lax, cookie.SameSite);
        Assert.Equal("/", cookie.Path);
        Assert.Null(cookie.Domain);
        Assert.Equal(TimeSpan.FromDays(30), CookieOptions.ExpireTimeSpan);
        Assert.IsType<DbTicketStore>(CookieOptions.SessionStore);
    }

    [Fact]
    public async Task Sign_in_sets_a_secure_http_only_correlation_cookie()
    {
        var response = await Client().GetAsync("/api/auth/steam/sign-in");

        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"),
            value => value.StartsWith(".AspNetCore.Correlation.", StringComparison.Ordinal)).ToLowerInvariant();
        Assert.Contains("secure", setCookie);
        Assert.Contains("httponly", setCookie);
        Assert.Contains("samesite=lax", setCookie);
    }

    [Fact]
    public async Task A_valid_session_cookie_signs_the_user_in()
    {
        var cookie = await SignInAsync(DateTimeOffset.UtcNow.AddDays(-1));
        var session = await GetSessionAsync(cookie);
        Assert.True(session.SignedIn);
        Assert.Equal(SteamId, session.SteamId);
    }

    [Fact]
    public async Task The_session_cookie_carries_only_a_session_key_not_the_identity()
    {
        var cookie = await SignInAsync(DateTimeOffset.UtcNow);
        var ticket = CookieOptions.TicketDataFormat.Unprotect(cookie.Split('=', 2)[1]);

        var claim = Assert.Single(ticket!.Principal.Claims);
        Assert.Equal("Microsoft.AspNetCore.Authentication.Cookies-SessionId", claim.Type);
    }

    [Fact]
    public async Task Sessions_are_stored_under_a_hash_of_the_key_not_the_key_itself()
    {
        var store = factory.Services.GetRequiredService<DbTicketStore>();
        var ticket = new Microsoft.AspNetCore.Authentication.AuthenticationTicket(
            SiftClaims.CreatePrincipal(SteamId, DateTimeOffset.UtcNow, CookieAuthenticationDefaults.AuthenticationScheme),
            new() { ExpiresUtc = DateTimeOffset.UtcNow.AddDays(1) },
            CookieAuthenticationDefaults.AuthenticationScheme);

        var key = await store.StoreAsync(ticket);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Sift.Api.Data.AppDbContext>();
        Assert.DoesNotContain(db.UserSessions, session => session.Id == key);
        Assert.Contains(db.UserSessions, session => session.Id == Convert.ToHexString(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.ASCII.GetBytes(key))).ToLowerInvariant());
        Assert.NotNull(await store.RetrieveAsync(key));
    }

    [Fact]
    public async Task Signing_out_ends_the_session_even_for_a_copied_cookie()
    {
        var cookie = await SignInAsync(DateTimeOffset.UtcNow);
        var copy = cookie;

        var signOut = await SendAsync(HttpMethod.Post, "/api/auth/sign-out", cookie);
        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);

        Assert.False((await GetSessionAsync(copy)).SignedIn);
        // The copy is now just a guest: it can't change the library it used to own.
        var write = await SendAsync(HttpMethod.Delete, $"/api/profiles/{SteamId}/saved-views/{Guid.NewGuid()}", copy);
        Assert.Equal(HttpStatusCode.Unauthorized, write.StatusCode);
    }

    [Fact]
    public async Task Signing_out_everywhere_ends_every_session_of_that_account_only()
    {
        var laptop = await SignInAsync(DateTimeOffset.UtcNow);
        var phone = await SignInAsync(DateTimeOffset.UtcNow);
        var someoneElse = await SignInAsync(DateTimeOffset.UtcNow, steamId: "76561198000000002");

        var response = await SendAsync(HttpMethod.Post, "/api/auth/sign-out-everywhere", laptop);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        Assert.False((await GetSessionAsync(laptop)).SignedIn);
        Assert.False((await GetSessionAsync(phone)).SignedIn);
        Assert.True((await GetSessionAsync(someoneElse)).SignedIn);
    }

    [Fact]
    public async Task Signing_out_everywhere_needs_a_sign_in()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/auth/sign-out-everywhere", cookie: null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_session_older_than_the_absolute_lifetime_is_rejected_and_deleted()
    {
        var cookie = await SignInAsync(DateTimeOffset.UtcNow.AddDays(-91));
        Assert.False((await GetSessionAsync(cookie)).SignedIn);
    }

    [Fact]
    public async Task A_session_without_a_sign_in_time_is_rejected()
    {
        var cookie = await SignInAsync(signedInAt: null);
        Assert.False((await GetSessionAsync(cookie)).SignedIn);
    }

    [Fact]
    public async Task A_tampered_session_cookie_is_ignored()
    {
        var session = await GetSessionAsync($"{CookieOptions.Cookie.Name}=CfDJ8not-a-real-ticket");
        Assert.False(session.SignedIn);
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/auth/session")]
    [InlineData("/api/profiles/76561198000000001/library")]
    public async Task Responses_carry_security_headers(string path)
    {
        var response = await Client().GetAsync(path);
        var headers = response.Headers;

        Assert.Equal(SecurityHeadersMiddleware.ContentSecurityPolicy, Single(headers, "Content-Security-Policy"));
        Assert.Contains("frame-ancestors 'none'", Single(headers, "Content-Security-Policy"));
        Assert.Equal("nosniff", Single(headers, "X-Content-Type-Options"));
        Assert.Equal("DENY", Single(headers, "X-Frame-Options"));
        Assert.Equal("no-referrer", Single(headers, "Referrer-Policy"));
        Assert.Equal("same-origin", Single(headers, "Cross-Origin-Opener-Policy"));
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task Error_responses_keep_the_security_headers()
    {
        var response = await SendAsync(HttpMethod.Delete, $"/api/profiles/{SteamId}/saved-views/{Guid.NewGuid()}", cookie: null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("nosniff", Single(response.Headers, "X-Content-Type-Options"));
    }

    /// <summary>Signs in through the real cookie handler and session store; returns "name=value" for a Cookie header.</summary>
    private async Task<string> SignInAsync(DateTimeOffset? signedInAt, string steamId = SteamId)
    {
        var query = $"steamId={steamId}" + (signedInAt is { } at ? $"&signedInAt={at.ToUnixTimeSeconds()}" : "");
        var response = await Client().GetAsync($"{SiftApiFactory.SignInPath}?{query}");
        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"),
            value => value.StartsWith(CookieOptions.Cookie.Name + "=", StringComparison.Ordinal));
        return setCookie.Split(';', 2)[0];
    }

    private async Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, string? cookie)
    {
        var request = new HttpRequestMessage(method, path);
        if (cookie is not null) request.Headers.Add("Cookie", cookie);
        request.Headers.Add(RequestHeaderCsrfMiddleware.HeaderName, "1");
        return await Client().SendAsync(request);
    }

    private async Task<SessionDto> GetSessionAsync(string cookie) =>
        (await (await SendAsync(HttpMethod.Get, "/api/auth/session", cookie)).Content.ReadFromJsonAsync<SessionDto>())!;

    private static string Single(HttpResponseHeaders headers, string name) =>
        Assert.Single(headers.GetValues(name));

    private sealed record SessionDto(bool SignedIn, string? SteamId);
}
