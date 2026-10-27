using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;
using Sift.Api.Domain.Enums;
using Sift.Api.Infrastructure.Auth;

namespace Sift.Api.Tests;

/// <summary>
/// A favourites list belongs to its owner alone, and surfaces favourites' public notes (never their
/// private ones) on the owner's games.
/// </summary>
public sealed class FavouritesTests : IClassFixture<SiftApiFactory>
{
    private const string Owner = "76561198000000021";
    private const string Friend = "76561198000000022";
    private const string Stranger = "76561198000000023";
    private const string NeverSynced = "76561198000000029";
    private const int SharedGame = 548430;
    private const int SecretGame = 620;

    private readonly SiftApiFactory _factory;

    public FavouritesTests(SiftApiFactory factory)
    {
        _factory = factory;
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Profiles.Any(p => p.SteamId == Owner)) return;

        foreach (var (steamId, name) in new[] { (Owner, "Owner"), (Friend, "Sam"), (Stranger, "Stranger") })
        {
            db.Profiles.Add(new SteamProfile { SteamId = steamId, PersonaName = name, IsLibraryVisible = true, LastSyncedUtc = DateTime.UtcNow });
        }
        db.Apps.Add(new SteamApp { AppId = SharedGame, Name = "Deep Rock Galactic", LastUpdatedUtc = DateTime.UtcNow });
        db.Apps.Add(new SteamApp { AppId = SecretGame, Name = "Portal 2", LastUpdatedUtc = DateTime.UtcNow });
        db.OwnedGames.Add(new OwnedGame { SteamId = Friend, AppId = SharedGame, PlaytimeForeverMinutes = 9000, LastSyncedUtc = DateTime.UtcNow });
        db.BacklogEntries.Add(new BacklogEntry { SteamId = Friend, AppId = SharedGame, Notes = "Rock and stone!", Status = BacklogStatus.Playing });
        db.BacklogEntries.Add(new BacklogEntry { SteamId = Friend, AppId = SecretGame, Notes = "Gift for Owner", NotesPrivate = true });
        db.BacklogEntries.Add(new BacklogEntry { SteamId = Stranger, AppId = SharedGame, Notes = "Not a favourite" });
        db.SaveChanges();
    }

    private HttpClient Client(string? signedInAs)
    {
        var client = _factory.CreateClient();
        if (signedInAs is not null) client.DefaultRequestHeaders.Add(SiftApiFactory.TestSteamIdHeader, signedInAs);
        client.DefaultRequestHeaders.Add(RequestHeaderCsrfMiddleware.HeaderName, "1");
        return client;
    }

    private static string Path(string suffix = "") => $"/api/profiles/{Owner}/favourites{suffix}";

    private Task<HttpResponseMessage> Favourite(string steamId, string? alias = null) =>
        Client(Owner).PutAsJsonAsync(Path($"/{steamId}"), new { alias });

    [Fact]
    public async Task A_favourite_is_saved_with_its_alias_and_renamed_in_place()
    {
        Assert.Equal(HttpStatusCode.OK, (await Favourite(Friend, "  Sam from work ")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Favourite(Friend, "Sammy")).StatusCode);

        var favourites = await Client(Owner).GetFromJsonAsync<List<FavouriteDto>>(Path());
        var saved = Assert.Single(favourites!, favourite => favourite.SteamId == Friend);
        Assert.Equal(new FavouriteDto(Friend, "Sammy", "Sam"), saved);
    }

    [Fact]
    public async Task A_blank_alias_falls_back_to_none()
    {
        await Favourite(Friend, "   ");
        var favourites = await Client(Owner).GetFromJsonAsync<List<FavouriteDto>>(Path());
        Assert.Null(Assert.Single(favourites!, favourite => favourite.SteamId == Friend).Alias);
    }

    [Theory]
    [InlineData(Owner, HttpStatusCode.BadRequest)] // yourself
    [InlineData(NeverSynced, HttpStatusCode.NotFound)]
    [InlineData("not-a-steam-id", HttpStatusCode.BadRequest)]
    public async Task Only_other_synced_profiles_can_be_favourited(string steamId, HttpStatusCode expected)
    {
        Assert.Equal(expected, (await Favourite(steamId)).StatusCode);
    }

    [Fact]
    public async Task An_alias_longer_than_the_limit_is_rejected()
    {
        var response = await Favourite(Friend, new string('x', FavouriteProfile.AliasMaxLength + 1));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(Stranger, HttpStatusCode.Forbidden)]
    [InlineData(null, HttpStatusCode.Unauthorized)] // a guest
    public async Task Nobody_else_can_read_or_change_someone_s_favourites(string? viewer, HttpStatusCode expected)
    {
        var client = Client(viewer);
        Assert.Equal(expected, (await client.GetAsync(Path())).StatusCode);
        Assert.Equal(expected, (await client.GetAsync(Path($"/notes/{SharedGame}"))).StatusCode);
        Assert.Equal(expected, (await client.PutAsJsonAsync(Path($"/{Friend}"), new { alias = "x" })).StatusCode);
        Assert.Equal(expected, (await client.DeleteAsync(Path($"/{Friend}"))).StatusCode);
    }

    [Fact]
    public async Task Favourites_public_notes_show_on_a_game_but_private_notes_and_strangers_do_not()
    {
        await Favourite(Friend, "Sam from work");

        var shared = await Client(Owner).GetFromJsonAsync<List<NoteDto>>(Path($"/notes/{SharedGame}"));
        Assert.Equal([new NoteDto(Friend, "Sam from work", "Rock and stone!", "Playing", 9000)], shared);

        var secret = await Client(Owner).GetFromJsonAsync<List<NoteDto>>(Path($"/notes/{SecretGame}"));
        Assert.Empty(secret!);
    }

    [Fact]
    public async Task Removing_a_favourite_hides_their_notes_and_can_be_repeated()
    {
        await Favourite(Friend);
        Assert.Equal(HttpStatusCode.NoContent, (await Client(Owner).DeleteAsync(Path($"/{Friend}"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Client(Owner).DeleteAsync(Path($"/{Friend}"))).StatusCode);

        var notes = await Client(Owner).GetFromJsonAsync<List<NoteDto>>(Path($"/notes/{SharedGame}"));
        Assert.Empty(notes!);
    }

    private sealed record FavouriteDto(string SteamId, string? Alias, string PersonaName);

    private sealed record NoteDto(string SteamId, string? Alias, string Notes, string Status, int PlaytimeForeverMinutes);
}
