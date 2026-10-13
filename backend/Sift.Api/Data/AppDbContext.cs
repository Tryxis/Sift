using Microsoft.EntityFrameworkCore;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SteamProfile> Profiles => Set<SteamProfile>();
    public DbSet<SteamApp> Apps => Set<SteamApp>();
    public DbSet<OwnedGame> OwnedGames => Set<OwnedGame>();
    public DbSet<BacklogEntry> BacklogEntries => Set<BacklogEntry>();
    public DbSet<SavedFilterView> SavedFilterViews => Set<SavedFilterView>();
    public DbSet<HowLongToBeatEntry> HowLongToBeatEntries => Set<HowLongToBeatEntry>();
    public DbSet<SteamReviewSummary> ReviewSummaries => Set<SteamReviewSummary>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
