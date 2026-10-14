using Npgsql;

namespace Sift.Api.Data;

/// <summary>
/// Neon (and most Postgres hosts) hand out URIs such as postgresql://user:pass@host/db?sslmode=require,
/// which Npgsql doesn't accept. This turns one into Npgsql's keyword form. Errors never include the value.
/// </summary>
internal static class PostgresConnectionString
{
    public static string Normalize(string connectionString)
    {
        var trimmed = connectionString.Trim();
        if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString;
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) || string.IsNullOrEmpty(uri.Host))
        {
            throw new InvalidOperationException("ConnectionStrings:Default looks like a Postgres URI but couldn't be parsed.");
        }

        var builder = new NpgsqlConnectionStringBuilder { Host = uri.Host };
        if (!uri.IsDefaultPort && uri.Port > 0)
        {
            builder.Port = uri.Port;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        if (userInfo[0].Length > 0)
        {
            builder.Username = Uri.UnescapeDataString(userInfo[0]);
        }
        if (userInfo.Length == 2)
        {
            builder.Password = Uri.UnescapeDataString(userInfo[1]);
        }

        var database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
        if (database.Length > 0)
        {
            builder.Database = database;
        }

        foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = pair.Split('=', 2);
            var key = Uri.UnescapeDataString(parts[0]);
            var value = parts.Length == 2 ? Uri.UnescapeDataString(parts[1]) : string.Empty;
            try
            {
                builder[key.Replace('_', ' ')] = value;
            }
            catch (ArgumentException)
            {
                // Libpq-only options (e.g. options=...) that Npgsql doesn't know are skipped.
            }
        }

        return builder.ConnectionString;
    }
}
