using System.Net;
using System.Net.Http.Json;
using Sift.Api.Infrastructure.Auth;

namespace Sift.Api.Tests;

/// <summary>Guests and signed-in users can read any profile; only a library's signed-in owner can change it.</summary>
public sealed class AccessControlTests(SiftApiFactory factory) : IClassFixture<SiftApiFactory>
{
    private const string Owner = "76561198000000001";
    private const string SomeoneElse = "76561198000000002";

    private HttpClient Client(string? signedInAs = null, bool withCsrfHeader = true)
    {
        var client = factory.CreateClient(new() { AllowAutoRedirect = false });
        if (signedInAs is not null) client.DefaultRequestHeaders.Add(SiftApiFactory.TestSteamIdHeader, signedInAs);
        if (withCsrfHeader) client.DefaultRequestHeaders.Add(RequestHeaderCsrfMiddleware.HeaderName, "1");
        return client;
    }

    private static HttpRequestMessage PatchBacklog(string steamId) =>
        new(HttpMethod.Patch, $"/api/profiles/{steamId}/games/620/backlog")
        {
            Content = JsonContent.Create(new { status = "Playing" }),
        };

    [Fact]
    public async Task Health_check_needs_no_sign_in()
    {
        var response = await Client().GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Session_reports_signed_out_without_a_cookie()
    {
        var session = await Client().GetFromJsonAsync<SessionDto>("/api/auth/session");
        Assert.Equal(new SessionDto(false, null), session);
    }

    [Fact]
    public async Task Session_reports_the_signed_in_steam_id()
    {
        var session = await Client(Owner).GetFromJsonAsync<SessionDto>("/api/auth/session");
        Assert.Equal(new SessionDto(true, Owner), session);
    }

    [Theory]
    [InlineData("/api/profiles/76561198000000001/saved-views", HttpStatusCode.OK)]
    // Not synced in this test database, so 404: past authorization, into the service.
    [InlineData("/api/profiles/76561198000000001/library", HttpStatusCode.NotFound)]
    [InlineData("/api/profiles/76561198000000001/history", HttpStatusCode.NotFound)]
    public async Task Guests_can_read_any_profile(string path, HttpStatusCode expected)
    {
        var response = await Client().GetAsync(path);
        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task Guests_can_look_up_any_profile()
    {
        var response = await Client().PostAsJsonAsync("/api/profiles/sync", new { identifier = "gabelogannewell" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("gabelogannewell by guest", factory.Syncs);
    }

    [Fact]
    public async Task Guests_cannot_change_saved_views()
    {
        var response = await Client().DeleteAsync($"/api/profiles/{Owner}/saved-views/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.DoesNotContain($"delete:{Owner}", factory.SavedViewWrites);
    }

    [Fact]
    public async Task Signed_out_writes_are_rejected()
    {
        var response = await Client().SendAsync(PatchBacklog(Owner));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Owner_can_change_their_own_backlog()
    {
        var response = await Client(Owner).SendAsync(PatchBacklog(Owner));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains($"{Owner}/620", factory.BacklogWrites);
    }

    [Fact]
    public async Task Another_users_backlog_is_read_only()
    {
        var response = await Client(Owner).SendAsync(PatchBacklog(SomeoneElse));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.DoesNotContain($"{SomeoneElse}/620", factory.BacklogWrites);
    }

    [Fact]
    public async Task Another_users_saved_views_can_be_read_but_not_changed()
    {
        var client = Client(Owner);

        var read = await client.GetAsync($"/api/profiles/{SomeoneElse}/saved-views");
        var select = await client.PutAsJsonAsync($"/api/profiles/{SomeoneElse}/saved-views/selection", new { id = (Guid?)null });
        var delete = await client.DeleteAsync($"/api/profiles/{SomeoneElse}/saved-views/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, select.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, delete.StatusCode);
        Assert.DoesNotContain(factory.SavedViewWrites, write => write.EndsWith(SomeoneElse, StringComparison.Ordinal));
    }

    [Fact]
    public async Task Owner_can_change_their_own_saved_views()
    {
        var response = await Client(Owner).DeleteAsync($"/api/profiles/{Owner}/saved-views/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains($"delete:{Owner}", factory.SavedViewWrites);
    }

    [Fact]
    public async Task Writes_without_the_csrf_header_are_rejected_even_for_the_owner()
    {
        var response = await Client(Owner, withCsrfHeader: false).SendAsync(PatchBacklog(Owner));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Sign_in_redirects_to_steam_with_a_callback_to_sift()
    {
        var response = await Client().GetAsync("/api/auth/steam/sign-in?returnUrl=/");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location!.ToString();
        Assert.StartsWith("https://steamcommunity.com/openid/login?", location);
        Assert.Contains(Uri.EscapeDataString("http://localhost/api/auth/steam/callback"), location);
    }

    [Fact]
    public async Task Unknown_api_routes_are_404s_not_the_app_shell()
    {
        var response = await Client().GetAsync("/api/nope");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private sealed record SessionDto(bool SignedIn, string? SteamId);
}
