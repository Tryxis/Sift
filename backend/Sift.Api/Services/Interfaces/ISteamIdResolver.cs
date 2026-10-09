namespace Sift.Api.Services.Interfaces;

public interface ISteamIdResolver
{
    /// <summary>Turns any supported identifier into a SteamID64, calling Steam for vanity names.</summary>
    Task<string> ResolveAsync(string identifier, CancellationToken cancellationToken);
}
