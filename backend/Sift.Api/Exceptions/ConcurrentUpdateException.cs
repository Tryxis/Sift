namespace Sift.Api.Exceptions;

/// <summary>Another request changed the same data at the same moment and a retry didn't resolve it.</summary>
public sealed class ConcurrentUpdateException(string message, Exception? innerException = null)
    : ApiException(message, innerException)
{
    public override int StatusCode => StatusCodes.Status409Conflict;
    public override string Title => "Conflicting update";
}
