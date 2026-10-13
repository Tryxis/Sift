namespace Sift.Api.Domain.Entities;

public sealed class SavedFilterView
{
    public Guid Id { get; set; }
    public string SteamId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Configuration { get; set; } = "{}";
    public bool IsSelected { get; set; }
    public DateTime UpdatedUtc { get; set; }

    public SteamProfile Profile { get; set; } = null!;
}
