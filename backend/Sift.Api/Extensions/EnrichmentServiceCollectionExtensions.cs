using Microsoft.Extensions.Options;
using Sift.Api.Configuration;
using Sift.Api.Infrastructure.BackgroundJobs;
using Sift.Api.Integrations.HowLongToBeat;
using Sift.Api.Integrations.Steam.Store;
using Sift.Api.Services;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Extensions;

public static class EnrichmentServiceCollectionExtensions
{
    public static IServiceCollection AddMetadataEnrichment(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<EnrichmentOptions>()
            .Bind(configuration.GetSection(EnrichmentOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<HowLongToBeatOptions>()
            .Bind(configuration.GetSection(HowLongToBeatOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<ReviewScoreOptions>()
            .Bind(configuration.GetSection(ReviewScoreOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<StoreDetailsOptions>()
            .Bind(configuration.GetSection(StoreDetailsOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<AchievementOptions>()
            .Bind(configuration.GetSection(AchievementOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddHttpClient(HowLongToBeatClient.HttpClientName, (provider, client) =>
        {
            var settings = provider.GetRequiredService<IOptions<HowLongToBeatOptions>>().Value;
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", settings.UserAgent);
            client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "*/*");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Referer", settings.BaseUrl);
            client.DefaultRequestHeaders.TryAddWithoutValidation("Origin", settings.BaseUrl.TrimEnd('/'));
        });
        services.AddSingleton<IHowLongToBeatClient, HowLongToBeatClient>();

        services.AddHttpClient<ISteamStoreClient, SteamStoreClient>((provider, client) =>
        {
            var settings = provider.GetRequiredService<IOptions<ReviewScoreOptions>>().Value;
            client.BaseAddress = new Uri(settings.StoreBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(20);
        });

        services.AddScoped<IReviewScoreService, ReviewScoreService>();
        services.AddScoped<IHowLongToBeatService, HowLongToBeatService>();
        services.AddScoped<IStoreDetailsEnrichmentService, StoreDetailsEnrichmentService>();
        services.AddScoped<IAchievementEnrichmentService, AchievementEnrichmentService>();
        services.AddScoped<IGameMetadataEnrichmentService, GameMetadataEnrichmentService>();

        services.AddSingleton<IEnrichmentTrigger, EnrichmentTrigger>();
        services.AddHostedService<MetadataEnrichmentJob>();

        return services;
    }
}
