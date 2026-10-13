namespace Sift.Api.Exceptions;

public sealed class SavedFilterViewNotFoundException(Guid id)
    : ApiException($"Saved filter view '{id}' was not found.")
{
    public override int StatusCode => StatusCodes.Status404NotFound;
    public override string Title => "Saved filter view not found";
}
