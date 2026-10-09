namespace Sift.Api.Exceptions;

/// <summary>
/// Base for expected, user-facing failures. The global exception handler turns these
/// into RFC 7807 ProblemDetails, so controllers never need try/catch.
/// </summary>
public abstract class ApiException(string message, Exception? innerException = null)
    : Exception(message, innerException)
{
    public abstract int StatusCode { get; }
    public abstract string Title { get; }
}
