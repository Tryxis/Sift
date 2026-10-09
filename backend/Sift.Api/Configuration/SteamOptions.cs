using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Configuration;

/// <summary>
/// Bound from the "Steam" configuration section. The API key is never committed:
/// it comes from user-secrets locally and environment variables in hosted environments.
/// </summary>
public sealed class SteamOptions
{
    public const string SectionName = "Steam";

    [Required(AllowEmptyStrings = false, ErrorMessage =
        "Steam:ApiKey is not set. Run `dotnet user-secrets set \"Steam:ApiKey\" \"<your key>\"` " +
        "or set the Steam__ApiKey environment variable.")]
    public string ApiKey { get; init; } = string.Empty;

    [Required, Url]
    public string BaseUrl { get; init; } = "https://api.steampowered.com/";
}
