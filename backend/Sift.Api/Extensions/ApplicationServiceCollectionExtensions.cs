using Microsoft.Extensions.DependencyInjection.Extensions;
using Sift.Api.Services;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Extensions;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddMemoryCache();

        services.AddScoped<ISteamIdResolver, SteamIdResolver>();
        services.AddScoped<ILibraryQueryService, LibraryQueryService>();
        services.AddScoped<ILibrarySyncService, LibrarySyncService>();
        services.AddScoped<IBacklogService, BacklogService>();
        services.AddScoped<ISavedFilterViewService, SavedFilterViewService>();
        services.AddScoped<IFavouriteProfileService, FavouriteProfileService>();
        services.AddScoped<IAppDetailsService, AppDetailsService>();
        services.AddScoped<IAchievementService, AchievementService>();
        services.AddScoped<IWishlistService, WishlistService>();
        services.AddScoped<ITimeToBeatLookupService, TimeToBeatLookupService>();
        services.AddScoped<IProfileHistoryService, ProfileHistoryService>();

        return services;
    }
}
