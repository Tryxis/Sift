using Microsoft.AspNetCore.Authorization;

namespace Sift.Api.Infrastructure.Auth;

/// <summary>
/// Met when the signed-in SteamID matches the {steamId} route value, i.e. the request changes the
/// caller's own library. Anyone signed in can read any profile; only its owner can change it.
/// </summary>
public sealed class ProfileOwnerRequirement : IAuthorizationRequirement
{
    public const string PolicyName = "ProfileOwner";
    public const string RouteKey = "steamId";
}

public sealed class ProfileOwnerHandler : AuthorizationHandler<ProfileOwnerRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ProfileOwnerRequirement requirement)
    {
        // With endpoint routing the resource is the HttpContext of the request being authorized.
        if (context.Resource is HttpContext httpContext &&
            context.User.GetSteamId() is { } signedInSteamId &&
            httpContext.GetRouteValue(ProfileOwnerRequirement.RouteKey) is string routeSteamId &&
            string.Equals(signedInSteamId, routeSteamId, StringComparison.Ordinal))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
