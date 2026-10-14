using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Sift.Api.Data;

internal static class DbUpdateExceptionExtensions
{
    /// <summary>True when another request inserted the same key first (Postgres 23505).</summary>
    public static bool IsUniqueViolation(this DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    public static bool IsUniqueViolation(this DbUpdateException exception, string constraintName) =>
        exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } postgres
        && string.Equals(postgres.ConstraintName, constraintName, StringComparison.Ordinal);
}
