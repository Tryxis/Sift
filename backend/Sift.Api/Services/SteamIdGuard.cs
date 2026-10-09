using Sift.Api.Exceptions;
using Sift.Api.Integrations.Steam;

namespace Sift.Api.Services;

internal static class SteamIdGuard
{
    public static void EnsureSteamId64(string steamId)
    {
        if (!SteamIdentifierParser.IsSteamId64(steamId))
        {
            throw new InvalidSteamIdentifierException(steamId);
        }
    }
}
