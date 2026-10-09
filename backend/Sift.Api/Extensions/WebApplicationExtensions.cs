using Microsoft.EntityFrameworkCore;
using Sift.Api.Data;

namespace Sift.Api.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        app.UseExceptionHandler();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        // Serves the built React app from wwwroot (`npm run build:app`),
        // so the whole of Sift runs from one process and one address.
        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.MapControllers();
        app.MapHealthChecks("/api/health");

        // Unknown API routes stay 404s instead of falling through to the app shell.
        app.MapFallback("/api/{**path}", () => Results.NotFound());
        app.MapFallbackToFile("index.html");

        return app;
    }

    /// <summary>
    /// Applies pending EF Core migrations on startup in Development only.
    /// Hosted environments should run `dotnet ef database update` (or a migration bundle) as a deploy step.
    /// </summary>
    public static async Task ApplyMigrationsInDevelopmentAsync(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!db.Database.GetMigrations().Any())
        {
            app.Logger.LogWarning(
                "No EF Core migrations found. Run `dotnet ef migrations add InitialCreate` " +
                "in the API project folder, then restart.");
            return;
        }

        await db.Database.MigrateAsync();
    }
}
