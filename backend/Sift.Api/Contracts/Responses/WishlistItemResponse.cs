namespace Sift.Api.Contracts.Responses;

/// <summary>
/// One wishlisted app. Store fields are null when Steam didn't return them; time-to-beat fields
/// come only from completion times Sift already holds, so they're null for most unowned games.
/// </summary>
public sealed record WishlistItemResponse(
    int AppId,
    string Name,
    string HeaderImageUrl,
    int Priority,
    DateTime? AddedUtc,
    string? ReleaseDate,
    bool ComingSoon,
    double? ReviewScore,
    int? ReviewCount,
    string? PriceFormatted,
    int? DiscountPercent,
    bool IsFree,
    int? TimeToBeatMainMinutes,
    int? TimeToBeatMainExtrasMinutes,
    int? TimeToBeatCompletionistMinutes);
