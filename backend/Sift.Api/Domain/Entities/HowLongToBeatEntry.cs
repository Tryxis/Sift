using Sift.Api.Domain.Enums;

namespace Sift.Api.Domain.Entities;

/// <summary>
/// Completion-time estimates for one Steam app, shared by every profile that owns it.
/// Refreshed by the daily enrichment job, never during a user request.
/// </summary>
public class HowLongToBeatEntry
{
    public int AppId { get; set; }

    public HowLongToBeatMatchStatus MatchStatus { get; set; }
    public int? HowLongToBeatGameId { get; set; }
    public string? HowLongToBeatName { get; set; }

    public int? MainMinutes { get; set; }
    public int? MainExtrasMinutes { get; set; }
    public int? CompletionistMinutes { get; set; }

    public DateTime LastCheckedUtc { get; set; }

    public SteamApp App { get; set; } = null!;
}
