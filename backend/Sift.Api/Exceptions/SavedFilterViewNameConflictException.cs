namespace Sift.Api.Exceptions;

public sealed class SavedFilterViewNameConflictException(string name)
    : ApiException($"A saved filter view named '{name}' already exists.")
{
    public override int StatusCode => StatusCodes.Status409Conflict;
    public override string Title => "Saved filter view name already exists";
}
