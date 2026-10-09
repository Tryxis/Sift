using System.Text;
using System.Text.RegularExpressions;
using Sift.Api.Integrations.HowLongToBeat.Models;

namespace Sift.Api.Integrations.HowLongToBeat;

/// <summary>
/// HowLongToBeat results don't carry Steam app IDs, so games are matched by name.
/// Pure logic, no I/O: an exact match on a normalised name or alias wins; otherwise the
/// closest name is accepted only if it's very close. A wrong time is worse than no time.
/// </summary>
public static partial class HowLongToBeatMatcher
{
    private const double MinimumSimilarity = 0.88;

    [GeneratedRegex(@"[^\p{L}\p{N}]+")]
    private static partial Regex NonAlphanumericPattern();

    [GeneratedRegex(@"[™®©]")]
    private static partial Regex TrademarkPattern();

    /// <summary>The Steam name with trademark symbols removed, suitable as search text.</summary>
    public static string ToSearchTerm(string steamName) =>
        TrademarkPattern().Replace(steamName, "").Trim();

    public static HowLongToBeatGame? FindBestMatch(string steamName, IReadOnlyList<HowLongToBeatGame> candidates)
    {
        var target = Normalise(steamName);
        if (target.Length == 0 || candidates.Count == 0)
        {
            return null;
        }

        var exact = candidates.FirstOrDefault(c =>
            Normalise(c.Name) == target ||
            (c.Alias ?? "").Split(',').Any(alias => Normalise(alias) == target));
        if (exact is not null)
        {
            return exact;
        }

        var best = candidates
            .Select(c => (Game: c, Score: Similarity(target, Normalise(c.Name))))
            .OrderByDescending(x => x.Score)
            .First();

        return best.Score >= MinimumSimilarity ? best.Game : null;
    }

    public static string Normalise(string name)
    {
        var withoutMarks = TrademarkPattern().Replace(name.ToLowerInvariant(), "").Replace("&", " and ");
        return NonAlphanumericPattern().Replace(withoutMarks.Normalize(NormalizationForm.FormC), " ").Trim();
    }

    private static double Similarity(string a, string b)
    {
        var longest = Math.Max(a.Length, b.Length);
        return longest == 0 ? 1 : 1.0 - (double)EditDistance(a, b) / longest;
    }

    private static int EditDistance(string a, string b)
    {
        var previous = new int[b.Length + 1];
        var current = new int[b.Length + 1];
        for (var j = 0; j <= b.Length; j++) previous[j] = j;

        for (var i = 1; i <= a.Length; i++)
        {
            current[0] = i;
            for (var j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                current[j] = Math.Min(Math.Min(current[j - 1] + 1, previous[j] + 1), previous[j - 1] + cost);
            }
            (previous, current) = (current, previous);
        }

        return previous[b.Length];
    }
}
