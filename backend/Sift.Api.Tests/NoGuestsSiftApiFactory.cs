using Microsoft.AspNetCore.Hosting;

namespace Sift.Api.Tests;

/// <summary>Sift with guest browsing switched off (Auth:GuestBrowsing=false): every read needs a sign-in.</summary>
public sealed class NoGuestsSiftApiFactory : SiftApiFactory
{
    protected override void ConfigureSettings(IWebHostBuilder builder) =>
        builder.UseSetting("Auth:GuestBrowsing", "false");
}
