namespace Sift.Api.Contracts.Responses;

public sealed record TimeToBeatResponse(
    int AppId,
    int? MainMinutes,
    int? MainExtrasMinutes,
    int? CompletionistMinutes,
    bool Matched);
