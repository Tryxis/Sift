namespace Sift.Api.Domain.Scoring;

/// <summary>
/// SteamDB's published rating formula (dedicated to the public domain by its author).
/// It pulls scores with few reviews towards 50%: for every 10x more reviews, the
/// raw Steam score is trusted twice as much. Computed from Steam's own review counts,
/// so SteamDB itself is never contacted.
/// </summary>
public static class SteamDbRating
{
    public static double? Calculate(int positive, int negative)
    {
        var total = positive + negative;
        if (total <= 0)
        {
            return null;
        }

        var score = (double)positive / total;
        var rating = score - (score - 0.5) * Math.Pow(2, -Math.Log10(total + 1));

        return Math.Round(rating * 100, 2);
    }
}
