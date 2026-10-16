using Sift.Api.Configuration;
using Sift.Api.Infrastructure.Auth;

namespace Sift.Api.Tests;

public sealed class SiftClaimsTests
{
    [Fact]
    public void Reads_the_steam_id_from_steams_claimed_identifier() =>
        Assert.Equal("76561197960287930",
            SiftClaims.SteamIdFromClaimedId("https://steamcommunity.com/openid/id/76561197960287930"));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("76561197960287930")]
    [InlineData("http://steamcommunity.com/openid/id/76561197960287930")]
    [InlineData("https://steamcommunity.com.evil.example/openid/id/76561197960287930")]
    [InlineData("https://evil.example/https://steamcommunity.com/openid/id/76561197960287930")]
    [InlineData("https://steamcommunity.com/openid/id/76561197960287930/extra")]
    [InlineData("https://steamcommunity.com/openid/id/12345")]
    public void Rejects_anything_else(string? claimedId) =>
        Assert.Null(SiftClaims.SteamIdFromClaimedId(claimedId));

    [Fact]
    public void An_empty_allow_list_lets_anyone_sign_in() =>
        Assert.True(new AuthOptions().IsAllowed("76561197960287930"));

    [Fact]
    public void An_allow_list_admits_only_its_members()
    {
        var options = new AuthOptions { AllowedSteamIds = ["76561197960287930"] };
        Assert.True(options.IsAllowed("76561197960287930"));
        Assert.False(options.IsAllowed("76561197960287931"));
    }
}
