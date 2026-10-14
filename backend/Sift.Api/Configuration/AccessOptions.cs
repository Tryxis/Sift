namespace Sift.Api.Configuration;

/// <summary>
/// Bound from the "Access" section. A temporary shared-password gate for hosted copies of Sift
/// until proper sign-in exists. Leave Password empty (the default) to run without a gate.
/// </summary>
public sealed class AccessOptions
{
    public const string SectionName = "Access";

    /// <summary>Shared password; set with the Access__Password environment variable when hosting.</summary>
    public string Password { get; init; } = string.Empty;

    /// <summary>How long a sign-in lasts before the password is asked for again.</summary>
    public int SessionDays { get; init; } = 30;

    public bool IsEnabled => !string.IsNullOrEmpty(Password);
}
