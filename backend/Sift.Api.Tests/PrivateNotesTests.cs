using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Tests;

/// <summary>Private notes reach their author and nobody else; public notes reach every signed-in user.</summary>
public sealed class PrivateNotesTests : IClassFixture<SiftApiFactory>
{
    private const string Owner = "76561198000000011";
    private const string Visitor = "76561198000000012";
    private const int PrivateGame = 620;
    private const int PublicGame = 400;

    private readonly SiftApiFactory _factory;

    public PrivateNotesTests(SiftApiFactory factory)
    {
        _factory = factory;
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Profiles.Any(p => p.SteamId == Owner)) return;

        db.Profiles.Add(new SteamProfile { SteamId = Owner, PersonaName = "Owner", IsLibraryVisible = true, LastSyncedUtc = DateTime.UtcNow });
        foreach (var (appId, name) in new[] { (PrivateGame, "Portal 2"), (PublicGame, "Portal") })
        {
            db.Apps.Add(new SteamApp { AppId = appId, Name = name, LastUpdatedUtc = DateTime.UtcNow });
            db.OwnedGames.Add(new OwnedGame { SteamId = Owner, AppId = appId, LastSyncedUtc = DateTime.UtcNow });
        }
        db.BacklogEntries.Add(new BacklogEntry { SteamId = Owner, AppId = PrivateGame, Notes = "Gift for my brother", NotesPrivate = true });
        db.BacklogEntries.Add(new BacklogEntry { SteamId = Owner, AppId = PublicGame, Notes = "Co-op with Sam" });
        db.SaveChanges();
    }

    private async Task<Dictionary<int, GameDto>> LibraryAsSeenBy(string? viewer)
    {
        var client = _factory.CreateClient();
        if (viewer is not null) client.DefaultRequestHeaders.Add(SiftApiFactory.TestSteamIdHeader, viewer);
        var library = await client.GetFromJsonAsync<LibraryDto>($"/api/profiles/{Owner}/library");
        return library!.Games.ToDictionary(game => game.AppId);
    }

    [Fact]
    public async Task The_owner_sees_their_private_note_marked_private()
    {
        var games = await LibraryAsSeenBy(Owner);
        Assert.Equal(new GameDto(PrivateGame, "Gift for my brother", true), games[PrivateGame]);
        Assert.Equal(new GameDto(PublicGame, "Co-op with Sam", false), games[PublicGame]);
    }

    [Theory]
    [InlineData(Visitor)]
    [InlineData(null)] // a guest
    public async Task Anyone_else_gets_no_private_note_and_no_hint_that_one_exists(string? viewer)
    {
        var games = await LibraryAsSeenBy(viewer);
        Assert.Equal(new GameDto(PrivateGame, null, false), games[PrivateGame]);
        Assert.Equal(new GameDto(PublicGame, "Co-op with Sam", false), games[PublicGame]);
    }

    private sealed record LibraryDto(List<GameDto> Games);

    private sealed record GameDto(int AppId, string? Notes, bool NotesPrivate);
}
