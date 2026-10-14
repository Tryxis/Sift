namespace Sift.Api.Services.Results;

public enum StoreDetailsRefreshOutcome
{
    /// <summary>Fetched and stored (or, for an app Sift doesn't track, just cached).</summary>
    Stored,

    /// <summary>Steam answered 429; the caller should back off.</summary>
    RateLimited,

    /// <summary>Any other failure; nothing was stored.</summary>
    Failed
}
