namespace Sift.Api.Integrations.Steam;

/// <summary>What a user typed into the search box, normalised into one of the two forms Steam understands.</summary>
public sealed record SteamIdentifier(SteamIdentifierKind Kind, string Value);
