using Sift.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApiLayer()
    .AddSteamSignIn(builder.Configuration, builder.Environment)
    .AddPersistence(builder.Configuration)
    .AddSteamIntegration(builder.Configuration)
    .AddMetadataEnrichment(builder.Configuration)
    .AddApplicationServices();

// Don't advertise the server software in every response.
builder.WebHost.ConfigureKestrel(kestrel => kestrel.AddServerHeader = false);

var app = builder.Build();

await app.ApplyMigrationsOnStartupAsync();
app.UseApiPipeline();

app.Run();

// Exposed for the integration tests (WebApplicationFactory<Program>).
public partial class Program;
