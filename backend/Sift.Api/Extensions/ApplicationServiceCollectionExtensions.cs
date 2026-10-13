using Sift.Api.Services;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Extensions;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);

        services.AddScoped<ISteamIdResolver, SteamIdResolver>();
        services.AddScoped<ILibraryQueryService, LibraryQueryService>();
        services.AddScoped<ILibrarySyncService, LibrarySyncService>();
        services.AddScoped<IBacklogService, BacklogService>();
        services.AddScoped<ISavedFilterViewService, SavedFilterViewService>();

        return services;
    }
}
