using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Integrations.Steam;

namespace Sift.Api.Extensions;

public static class SteamServiceCollectionExtensions
{
    public static IServiceCollection AddSteamIntegration(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<SteamOptions>()
            .Bind(configuration.GetSection(SteamOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddHttpClient<ISteamApiClient, SteamApiClient>((provider, client) =>
        {
            var options = provider.GetRequiredService<IOptions<SteamOptions>>().Value;
            client.BaseAddress = new Uri(options.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        return services;
    }
}
