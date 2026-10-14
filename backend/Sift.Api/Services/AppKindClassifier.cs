using System.Text.RegularExpressions;
using Sift.Api.Domain.Enums;

namespace Sift.Api.Services;

/// <summary>
/// Works out an app's <see cref="AppKind"/>. Steam's appdetails "type" marks demos, DLC, music and
/// so on, but reports software (Wallpaper Engine, Blender, ...) as "game"; those are recognised by
/// having only software genres. Demos and playtests often have no store page, so their name counts too.
/// </summary>
public static partial class AppKindClassifier
{
    private static readonly HashSet<string> SoftwareGenres = new(StringComparer.OrdinalIgnoreCase)
    {
        "Utilities", "Animation & Modeling", "Design & Illustration", "Audio Production",
        "Video Production", "Photo Editing", "Software Training", "Web Publishing",
        "Education", "Game Development", "Accounting"
    };

    private static readonly HashSet<string> OtherStoreTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "dlc", "music", "video", "mod", "series", "episode", "hardware", "advertising"
    };

    public static AppKind Classify(string name, string? storeType, IReadOnlyCollection<string>? genres)
    {
        if (string.Equals(storeType, "demo", StringComparison.OrdinalIgnoreCase) || DemoName().IsMatch(name))
        {
            return AppKind.Demo;
        }
        if (storeType is not null && OtherStoreTypes.Contains(storeType))
        {
            return AppKind.Other;
        }
        if (genres is { Count: > 0 } && genres.All(SoftwareGenres.Contains))
        {
            return AppKind.Software;
        }
        return AppKind.Game;
    }

    [GeneratedRegex(@"\b(demo|playtest)\b", RegexOptions.IgnoreCase)]
    private static partial Regex DemoName();
}
