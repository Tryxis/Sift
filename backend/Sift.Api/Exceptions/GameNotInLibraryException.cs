namespace Sift.Api.Exceptions;

public sealed class GameNotInLibraryException(string steamId, int appId)
    : ApiException($"App {appId} isn't in the library for profile {steamId}.")
{
    public override int StatusCode => StatusCodes.Status404NotFound;
    public override string Title => "Game not in library";
}
