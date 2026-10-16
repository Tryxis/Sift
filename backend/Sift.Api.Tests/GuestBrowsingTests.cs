using System.Net;
using System.Net.Http.Json;
using Sift.Api.Infrastructure.Auth;

namespace Sift.Api.Tests;

/// <summary>With guest browsing off, guests get nothing but sign-in; signed-in users are unaffected.</summary>
public sealed class GuestBrowsingOffTests(NoGuestsSiftApiFactory factory) : IClassFixture<NoGuestsSiftApiFactory>
{
    private HttpClient Client(string? signedInAs = null)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(RequestHeaderCsrfMiddleware.HeaderName, "1");
        if (signedInAs is not null) client.DefaultRequestHeaders.Add(SiftApiFactory.TestSteamIdHeader, signedInAs);
        return client;
    }

    [Theory]
    [InlineData("/api/profiles/76561198000000001/library")]
    [InlineData("/api/profiles/76561198000000001/saved-views")]
    [InlineData("/api/profiles/76561198000000001/history")]
    [InlineData("/api/profiles/76561198000000001/wishlist")]
    [InlineData("/api/apps/620/details")]
    public async Task Guest_reads_need_a_sign_in(string path)
    {
        var response = await Client().GetAsync(path);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Guest_lookups_need_a_sign_in()
    {
        var response = await Client().PostAsJsonAsync("/api/profiles/sync", new { identifier = "someone" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.DoesNotContain("someone by guest", factory.Syncs);
    }

    [Fact]
    public async Task Signed_in_users_can_still_read_and_look_up()
    {
        var client = Client("76561198000000001");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/profiles/76561198000000002/saved-views")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/profiles/sync", new { identifier = "someone" })).StatusCode);
    }
}

/// <summary>Guests spend Sift's Steam quota, so their lookups are limited more tightly than a signed-in user's.</summary>
public sealed class GuestRateLimitTests
{
    [Fact]
    public async Task A_guest_gets_ten_lookups_per_five_minutes_and_a_signed_in_user_is_unaffected()
    {
        // Its own app instance, so no other test has spent this guest's allowance.
        await using var factory = new SiftApiFactory();
        var guest = factory.CreateClient();
        guest.DefaultRequestHeaders.Add(RequestHeaderCsrfMiddleware.HeaderName, "1");

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 11; i++)
        {
            statuses.Add((await guest.PostAsJsonAsync("/api/profiles/sync", new { identifier = $"profile{i}" })).StatusCode);
        }

        Assert.All(statuses.Take(10), status => Assert.Equal(HttpStatusCode.OK, status));
        Assert.Equal(HttpStatusCode.TooManyRequests, statuses[10]);

        var user = factory.CreateClient();
        user.DefaultRequestHeaders.Add(RequestHeaderCsrfMiddleware.HeaderName, "1");
        user.DefaultRequestHeaders.Add(SiftApiFactory.TestSteamIdHeader, "76561198000000001");
        Assert.Equal(HttpStatusCode.OK, (await user.PostAsJsonAsync("/api/profiles/sync", new { identifier = "mine" })).StatusCode);
    }
}
