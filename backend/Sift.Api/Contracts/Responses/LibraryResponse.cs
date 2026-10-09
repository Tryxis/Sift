namespace Sift.Api.Contracts.Responses;

public sealed record LibraryResponse(
    ProfileResponse Profile,
    IReadOnlyList<LibraryGameResponse> Games);
