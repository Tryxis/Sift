namespace Sift.Api.Exceptions;

public sealed class SteamProfileNotFoundException(string input)
    : ApiException($"No Steam profile matches '{input}'.")
{
    public override int StatusCode => StatusCodes.Status404NotFound;
    public override string Title => "Steam profile not found";
}
