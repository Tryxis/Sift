namespace Sift.Api.Domain.Enums;

/// <summary>
/// What an owned app is, as far as Steam's store data and the app's name tell us.
/// Serialised by name ("Game", ...) via the API's string enum converter.
/// </summary>
public enum AppKind
{
    Game = 0,
    Software = 1,
    Demo = 2,

    /// <summary>DLC, soundtracks, videos, mods and other store types that aren't playable games.</summary>
    Other = 3
}
