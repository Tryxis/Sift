using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Sift.Api.Data;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Infrastructure.Auth;

/// <summary>
/// Server-side sessions. The cookie (still encrypted) carries only a random 256-bit session key, and
/// user_sessions holds a hash of that key with the ticket, so sign-out deletes the session for real:
/// a copied cookie stops working at once. Tickets are cached in memory for a minute to spare the
/// database a read on every request; removing a session also evicts it, so revocation is immediate
/// on a single instance (and within a minute on several).
/// </summary>
public sealed class DbTicketStore(IServiceScopeFactory scopes, IMemoryCache cache, TimeProvider timeProvider) : ITicketStore
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(1);
    private const int ExpiredSessionsPrunedPerSignIn = 100;

    public async Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var steamId = ticket.Principal.GetSteamId()
            ?? throw new InvalidOperationException("Only a signed-in Steam user's ticket can be stored.");
        var key = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var now = timeProvider.GetUtcNow().UtcDateTime;

        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Housekeeping: sign-ins are rare, so this keeps the table small without a background job.
        var expired = await db.UserSessions
            .Where(session => session.ExpiresUtc < now)
            .Take(ExpiredSessionsPrunedPerSignIn)
            .ToListAsync();
        db.UserSessions.RemoveRange(expired);

        db.UserSessions.Add(new UserSession
        {
            Id = Hash(key),
            SteamId = steamId,
            Ticket = TicketSerializer.Default.Serialize(ticket),
            CreatedUtc = now,
            ExpiresUtc = ExpiryOf(ticket, now),
        });
        await db.SaveChangesAsync();
        return key;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        var id = Hash(key);
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = await db.UserSessions.FindAsync(id);
        if (session is null)
        {
            return; // Signed out meanwhile; don't bring it back.
        }

        session.Ticket = TicketSerializer.Default.Serialize(ticket);
        session.ExpiresUtc = ExpiryOf(ticket, timeProvider.GetUtcNow().UtcDateTime);
        await db.SaveChangesAsync();
        cache.Remove(CacheKey(id));
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        var id = Hash(key);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        if (!cache.TryGetValue(CacheKey(id), out (byte[] Ticket, DateTime ExpiresUtc) entry))
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var session = await db.UserSessions.AsNoTracking()
                .Where(s => s.Id == id)
                .Select(s => new { s.Ticket, s.ExpiresUtc })
                .FirstOrDefaultAsync();
            if (session is null)
            {
                return null;
            }

            entry = (session.Ticket, session.ExpiresUtc);
            cache.Set(CacheKey(id), entry, CacheLifetime);
        }

        // Deserialised fresh each time: the cookie handler may change the ticket it's given.
        return entry.ExpiresUtc > now ? TicketSerializer.Default.Deserialize(entry.Ticket) : null;
    }

    public async Task RemoveAsync(string key)
    {
        var id = Hash(key);
        cache.Remove(CacheKey(id));
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (await db.UserSessions.FindAsync(id) is { } session)
        {
            db.UserSessions.Remove(session);
            await db.SaveChangesAsync();
        }
    }

    /// <summary>Signs a user out on every device ("sign out everywhere").</summary>
    public async Task RemoveAllAsync(string steamId, CancellationToken cancellationToken)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sessions = await db.UserSessions.Where(s => s.SteamId == steamId).ToListAsync(cancellationToken);
        foreach (var session in sessions)
        {
            cache.Remove(CacheKey(session.Id));
        }

        db.UserSessions.RemoveRange(sessions);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static DateTime ExpiryOf(AuthenticationTicket ticket, DateTime now) =>
        ticket.Properties.ExpiresUtc?.UtcDateTime ?? now.AddDays(1);

    private static string Hash(string key) =>
        Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes(key))).ToLowerInvariant();

    private static string CacheKey(string id) => $"session:{id}";
}
