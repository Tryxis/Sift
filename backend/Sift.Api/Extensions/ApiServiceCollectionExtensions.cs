using System.Text.Json.Serialization;
using Sift.Api.Infrastructure.ErrorHandling;

namespace Sift.Api.Extensions;

public static class ApiServiceCollectionExtensions
{
    public static IServiceCollection AddApiLayer(this IServiceCollection services)
    {
        services
            .AddControllers()
            .AddJsonOptions(options =>
                options.JsonSerializerOptions.Converters.Add(
                    new JsonStringEnumConverter(allowIntegerValues: false)));

        services.AddProblemDetails();
        services.AddExceptionHandler<ApiExceptionHandler>();
        services.AddHealthChecks();
        services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();

        return services;
    }
}
