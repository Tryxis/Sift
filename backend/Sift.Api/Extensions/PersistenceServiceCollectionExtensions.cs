using Microsoft.EntityFrameworkCore;
using Sift.Api.Data;

namespace Sift.Api.Extensions;

public static class PersistenceServiceCollectionExtensions
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Default is not set. Run " +
                "`dotnet user-secrets set \"ConnectionStrings:Default\" \"<your Neon connection string>\"` " +
                "or set the ConnectionStrings__Default environment variable.");
        }

        connectionString = PostgresConnectionString.Normalize(connectionString);

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure(maxRetryCount: 3)));

        return services;
    }
}
