namespace Sift.Api.Exceptions;

public sealed class InvalidSteamIdentifierException(string input)
    : ApiException($"'{input}' isn't a SteamID64, custom profile name, or Steam profile URL.")
{
    public override int StatusCode => StatusCodes.Status400BadRequest;
    public override string Title => "Invalid Steam identifier";
}
