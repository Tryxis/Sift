namespace Sift.Api.Domain.Entities;

/// <summary>
/// A signed-in browser. The browser's cookie holds a random session key; this row is keyed by a
/// SHA-256 hash of that key, so reading the table doesn't give anyone a usable session. Deleting
/// the row signs that browser out immediately.
/// </summary>
public class UserSession
{
    public const int IdLength = 64;

    /// <summary>Lowercase hex SHA-256 of the session key in the cookie.</summary>
    public string Id { get; set; } = string.Empty;

    public string SteamId { get; set; } = string.Empty;

    /// <summary>The serialized authentication ticket (the SteamID and sign-in time claims).</summary>
    public byte[] Ticket { get; set; } = [];

    public DateTime CreatedUtc { get; set; }

    /// <summary>When the session ends unless used again (sliding); renewed as the browser uses it.</summary>
    public DateTime ExpiresUtc { get; set; }
}
