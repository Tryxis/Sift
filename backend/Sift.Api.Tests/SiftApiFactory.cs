using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Sift.Api.Contracts.Requests;
using Sift.Api.Contracts.Responses;
using Sift.Api.Data;
using Sift.Api.Domain.Enums;
using Sift.Api.Infrastructure.Auth;
using Sift.Api.Services.Interfaces;

namespace Sift.Api.Tests;

/// <summary>
/// The real API pipeline (routing, authentication, authorization, CSRF check, controllers) on an
/// in-memory database, with the backlog and saved-view writers swapped for recording fakes.
/// Tests sign in either by sending X-Test-SteamId (a shortcut), or for real through
/// /test/sign-in, which issues a genuine session cookie backed by the session store.
/// </summary>
public class SiftApiFactory : WebApplicationFactory<Program>
{
    public const string TestSteamIdHeader = "X-Test-SteamId";
    public const string SignInPath = "/test/sign-in";

    /// <summary>Test-only key-encryption key (32 zero bytes). Never use a fixed key for real.</summary>
    public const string TestKeyEncryptionKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

    private readonly string _databaseName = $"sift-tests-{Guid.NewGuid()}";

    public ConcurrentBag<string> BacklogWrites { get; } = [];
    public ConcurrentBag<string> SavedViewWrites { get; } = [];
    public ConcurrentBag<string> Syncs { get; } = [];

    /// <summary>Extra settings for a variant of the app (e.g. guest browsing off).</summary>
    protected virtual void ConfigureSettings(IWebHostBuilder builder)
    {
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not Development, so startup doesn't try to migrate a database.
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", "Host=localhost;Database=sift_tests;Username=none;Password=none");
        builder.UseSetting("Steam:ApiKey", "test-key");
        builder.UseSetting("Enrichment:Enabled", "false");
        builder.UseSetting("DataProtection:KeyEncryptionKey", TestKeyEncryptionKey);
        ConfigureSettings(builder);

        builder.ConfigureTestServices(services =>
        {
            services.Replace(ServiceDescriptor.Scoped<IBacklogService>(_ => new FakeBacklogService(BacklogWrites)));
            services.Replace(ServiceDescriptor.Scoped<ISavedFilterViewService>(_ => new FakeSavedFilterViewService(SavedViewWrites)));
            // Syncs would call the Steam Web API; record them instead.
            services.Replace(ServiceDescriptor.Scoped<ILibrarySyncService>(_ => new FakeLibrarySyncService(Syncs)));
            services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());

            // An in-memory database instead of Postgres (one per factory, so test classes don't mix).
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            services.AddSingleton<IStartupFilter, TestSignInStartupFilter>();

            services.AddAuthentication().AddScheme<AuthenticationSchemeOptions, HeaderAuthenticationHandler>("Test", _ => { });
            // Authenticate with the test header; challenges and forbids still go through the real cookie
            // scheme, so its 401/403 ProblemDetails responses are what the tests see.
            services.PostConfigure<AuthenticationOptions>(options => options.DefaultAuthenticateScheme = "Test");
        });
    }

    /// <summary>
    /// GET /test/sign-in?steamId=…&amp;signedInAt=unix-seconds (omit signedInAt for a principal without one):
    /// signs in through the real cookie handler and session store, exactly as the Steam callback does.
    /// </summary>
    private sealed class TestSignInStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Map(SignInPath, branch => branch.Run(async context =>
            {
                var steamId = context.Request.Query["steamId"].ToString();
                var principal = long.TryParse(context.Request.Query["signedInAt"], out var signedInAt)
                    ? SiftClaims.CreatePrincipal(steamId, DateTimeOffset.FromUnixTimeSeconds(signedInAt), CookieAuthenticationDefaults.AuthenticationScheme)
                    : new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, steamId)], CookieAuthenticationDefaults.AuthenticationScheme));
                await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
                context.Response.StatusCode = StatusCodes.Status204NoContent;
            }));
            next(app);
        };
    }

    private sealed class HeaderAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // Without the header, authenticate the real way: from the session cookie.
            if (!Request.Headers.TryGetValue(TestSteamIdHeader, out var steamId))
            {
                return await Context.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            }

            var principal = SiftClaims.CreatePrincipal(steamId.ToString(), DateTimeOffset.UtcNow, Scheme.Name);
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
    }

    private sealed class FakeBacklogService(ConcurrentBag<string> writes) : IBacklogService
    {
        public Task<LibraryGameResponse> UpdateEntryAsync(
            string steamId, int appId, UpdateBacklogEntryRequest request, CancellationToken cancellationToken)
        {
            writes.Add($"{steamId}/{appId}");
            return Task.FromResult(new LibraryGameResponse(
                appId, "Test game", "https://example.test/header.jpg", null, 0, 0, null,
                request.Status ?? BacklogStatus.Backlog, null, null, false, null, null, null, null, null, null,
                false, null, false, [], null, null, null, null, null, AppKind.Game));
        }
    }

    private sealed class FakeLibrarySyncService(ConcurrentBag<string> syncs) : ILibrarySyncService
    {
        public Task<LibraryResponse> SyncAsync(string identifier, string? viewerSteamId, CancellationToken cancellationToken)
        {
            syncs.Add($"{identifier} by {viewerSteamId ?? "guest"}");
            return Task.FromResult(new LibraryResponse(
                new ProfileResponse(identifier, "Synced", null, null, true, DateTime.UtcNow, 0), []));
        }
    }

    private sealed class FakeSavedFilterViewService(ConcurrentBag<string> writes) : ISavedFilterViewService
    {
        public Task<IReadOnlyList<SavedFilterViewResponse>> GetAsync(string steamId, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<SavedFilterViewResponse>>([]);

        public Task<SavedFilterViewResponse> CreateAsync(string steamId, SaveFilterViewRequest request, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<SavedFilterViewResponse> UpdateAsync(string steamId, Guid id, SaveFilterViewRequest request, CancellationToken cancellationToken) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<SavedFilterViewResponse>> SelectAsync(string steamId, Guid? id, CancellationToken cancellationToken)
        {
            writes.Add($"select:{steamId}");
            return Task.FromResult<IReadOnlyList<SavedFilterViewResponse>>([]);
        }

        public Task DeleteAsync(string steamId, Guid id, CancellationToken cancellationToken)
        {
            writes.Add($"delete:{steamId}");
            return Task.CompletedTask;
        }
    }
}
