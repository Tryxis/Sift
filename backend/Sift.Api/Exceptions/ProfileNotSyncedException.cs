namespace Sift.Api.Exceptions;

public sealed class ProfileNotSyncedException(string steamId)
    : ApiException($"Profile {steamId} hasn't been synced yet. Sync it first.")
{
    public override int StatusCode => StatusCodes.Status404NotFound;
    public override string Title => "Profile not synced";
}
