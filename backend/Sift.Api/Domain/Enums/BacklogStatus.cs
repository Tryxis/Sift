namespace Sift.Api.Domain.Enums;

public enum BacklogStatus
{
    Backlog = 0,
    Playing = 1,
    Completed = 2,
    Abandoned = 3,
    Problem = 4,

    /// <summary>Finished before it was tracked here (or before buying it on Steam).</summary>
    CompletedBefore = 5,

    /// <summary>Not something to finish: software, launchers, demos, soundtracks and the like.</summary>
    NotApplicable = 6
}
