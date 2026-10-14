namespace Sift.Api.Contracts.Responses;

/// <summary>Whether the password gate is on, and whether this browser is signed in.</summary>
public sealed record AccessStatusResponse(bool Required, bool SignedIn);
