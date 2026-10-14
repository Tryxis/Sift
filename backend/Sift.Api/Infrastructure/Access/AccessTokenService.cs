using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;

namespace Sift.Api.Infrastructure.Access;

/// <summary>
/// Issues and checks the sign-in cookie for the password gate. The cookie is "{expiry}.{signature}",
/// signed with a key derived from the password, so it survives restarts without server-side state
/// and changing the password signs every browser out.
/// </summary>
public sealed class AccessTokenService(IOptions<AccessOptions> options, TimeProvider timeProvider)
{
    public const string CookieName = "sift_access";

    private readonly AccessOptions _options = options.Value;

    public bool IsEnabled => _options.IsEnabled;

    public bool PasswordMatches(string? attempt)
    {
        if (!IsEnabled || attempt is null)
        {
            return false;
        }

        // Compare fixed-length hashes so the comparison time doesn't leak the password's length.
        var expected = SHA256.HashData(Encoding.UTF8.GetBytes(_options.Password));
        var actual = SHA256.HashData(Encoding.UTF8.GetBytes(attempt));
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    public (string Value, DateTimeOffset Expires) CreateToken()
    {
        var expires = timeProvider.GetUtcNow().AddDays(Math.Max(1, _options.SessionDays));
        var expiry = expires.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        return ($"{expiry}.{Sign(expiry)}", expires);
    }

    public bool IsValid(string? token)
    {
        if (!IsEnabled || string.IsNullOrEmpty(token))
        {
            return false;
        }

        var separator = token.IndexOf('.');
        if (separator <= 0)
        {
            return false;
        }

        var expiry = token[..separator];
        if (!long.TryParse(expiry, NumberStyles.None, CultureInfo.InvariantCulture, out var expiresAt) ||
            expiresAt < timeProvider.GetUtcNow().ToUnixTimeSeconds())
        {
            return false;
        }

        var expected = Encoding.ASCII.GetBytes(Sign(expiry));
        var actual = Encoding.ASCII.GetBytes(token[(separator + 1)..]);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private string Sign(string expiry)
    {
        var key = SHA256.HashData(Encoding.UTF8.GetBytes($"sift-access-key:{_options.Password}"));
        var signature = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes($"sift-access:{expiry}"));
        return Convert.ToBase64String(signature).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
