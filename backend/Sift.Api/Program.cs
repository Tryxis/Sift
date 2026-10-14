using Sift.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApiLayer()
    .AddAccessGate(builder.Configuration)
    .AddPersistence(builder.Configuration)
    .AddSteamIntegration(builder.Configuration)
    .AddMetadataEnrichment(builder.Configuration)
    .AddApplicationServices();

var app = builder.Build();

await app.ApplyMigrationsOnStartupAsync();
app.UseApiPipeline();

app.Run();
