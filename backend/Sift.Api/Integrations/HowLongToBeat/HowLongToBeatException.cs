namespace Sift.Api.Integrations.HowLongToBeat;

/// <summary>HowLongToBeat couldn't be searched. Never user-facing: the enrichment job logs it and moves on.</summary>
public sealed class HowLongToBeatException(string message, Exception? innerException = null)
    : Exception(message, innerException);
