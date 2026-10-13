namespace Sift.Api.Exceptions;

public sealed class InvalidSavedFilterViewException(string message)
    : ApiException(message)
{
    public override int StatusCode => StatusCodes.Status400BadRequest;
    public override string Title => "Invalid saved filter view";
}
