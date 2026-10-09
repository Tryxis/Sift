namespace Sift.Api.Exceptions;

public sealed class SteamApiException(string message, Exception? innerException = null)
    : ApiException(message, innerException)
{
    public override int StatusCode => StatusCodes.Status502BadGateway;
    public override string Title => "Steam API error";
}
