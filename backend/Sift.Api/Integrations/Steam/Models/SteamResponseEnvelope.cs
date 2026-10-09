using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

/// <summary>Every Steam Web API payload is wrapped in a top-level "response" object.</summary>
public sealed class SteamResponseEnvelope<T>
{
    [JsonPropertyName("response")]
    public T? Response { get; init; }
}
