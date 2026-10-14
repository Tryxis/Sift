using System.Text.Json.Serialization;

namespace Sift.Api.Integrations.Steam.Models;

/// <summary>
/// IStoreBrowseService/GetItems. Every block is optional: items Steam can't show come back
/// with success != 1 and no data, and unreleased or free games omit price and release fields.
/// </summary>
public sealed class SteamStoreItemsResult
{
    [JsonPropertyName("store_items")]
    public List<SteamStoreItem>? StoreItems { get; init; }
}

public sealed class SteamStoreItem
{
    /// <summary>1 = found.</summary>
    [JsonPropertyName("success")]
    public int Success { get; init; }

    [JsonPropertyName("appid")]
    public int AppId { get; init; }

    /// <summary>The requested id; present even when the item wasn't found (appid is then 0).</summary>
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("is_free")]
    public bool? IsFree { get; init; }

    [JsonPropertyName("release")]
    public SteamStoreItemRelease? Release { get; init; }

    [JsonPropertyName("reviews")]
    public SteamStoreItemReviews? Reviews { get; init; }

    [JsonPropertyName("assets")]
    public SteamStoreItemAssets? Assets { get; init; }

    [JsonPropertyName("best_purchase_option")]
    public SteamStoreItemPurchaseOption? BestPurchaseOption { get; init; }
}

public sealed class SteamStoreItemRelease
{
    /// <summary>Unix seconds.</summary>
    [JsonPropertyName("steam_release_date")]
    public long? SteamReleaseDate { get; init; }

    [JsonPropertyName("is_coming_soon")]
    public bool? IsComingSoon { get; init; }

    /// <summary>e.g. "Coming soon" or "Q1 2026", set instead of a date for many unreleased games.</summary>
    [JsonPropertyName("custom_release_date_message")]
    public string? CustomReleaseDateMessage { get; init; }

    /// <summary>How precise the date is: date_full, date_month, date_quarter, date_year or text_comingsoon.</summary>
    [JsonPropertyName("coming_soon_display")]
    public string? ComingSoonDisplay { get; init; }
}

public sealed class SteamStoreItemReviews
{
    [JsonPropertyName("summary_filtered")]
    public SteamStoreItemReviewSummary? SummaryFiltered { get; init; }
}

public sealed class SteamStoreItemReviewSummary
{
    [JsonPropertyName("review_count")]
    public int? ReviewCount { get; init; }

    [JsonPropertyName("percent_positive")]
    public int? PercentPositive { get; init; }
}

public sealed class SteamStoreItemAssets
{
    /// <summary>e.g. "steam/apps/570/${FILENAME}?t=123", relative to the store asset CDN.</summary>
    [JsonPropertyName("asset_url_format")]
    public string? AssetUrlFormat { get; init; }

    /// <summary>Often "header.jpg", but newer apps use a hashed path like "abc123/header.jpg".</summary>
    [JsonPropertyName("header")]
    public string? Header { get; init; }
}

public sealed class SteamStoreItemPurchaseOption
{
    [JsonPropertyName("formatted_final_price")]
    public string? FormattedFinalPrice { get; init; }

    [JsonPropertyName("discount_pct")]
    public int? DiscountPercent { get; init; }
}
