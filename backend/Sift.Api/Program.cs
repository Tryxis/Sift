using Sift.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApiLayer()
    .AddPersistence(builder.Configuration)
    .AddSteamIntegration(builder.Configuration)
    .AddMetadataEnrichment(builder.Configuration)
    .AddApplicationServices();

var app = builder.Build();

await app.ApplyMigrationsInDevelopmentAsync();
app.UseApiPipeline();

app.Run();
