namespace Sift.Api.Contracts.Responses;

/// <summary>Playtime gained in one calendar month (UTC), with the month's top games.</summary>
public sealed record MonthlyPlaytimeResponse(
    string Month,
    int Minutes,
    IReadOnlyList<MonthlyPlaytimeGameResponse> Games);

public sealed record MonthlyPlaytimeGameResponse(int AppId, string Name, int Minutes);
