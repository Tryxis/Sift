using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Sift.Api.Configuration;

namespace Sift.Api.Infrastructure.Auth;

/// <summary>
/// For endpoints that only read (and the sync that fetches a public profile from Steam): met by any
/// signed-in user, and also by guests while Auth:GuestBrowsing is on. Nothing behind this policy can
/// change a library, and private notes are still left out for anyone but their owner.
/// </summary>
public sealed class ViewerRequirement : IAuthorizationRequirement
{
    public const string PolicyName = "Viewer";
}

public sealed class ViewerHandler(IOptionsMonitor<AuthOptions> options) : AuthorizationHandler<ViewerRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, ViewerRequirement requirement)
    {
        if (options.CurrentValue.GuestBrowsing || context.User.GetSteamId() is not null)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
