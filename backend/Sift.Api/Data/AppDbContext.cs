using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<SteamProfile> Profiles => Set<SteamProfile>();
    public DbSet<SteamApp> Apps => Set<SteamApp>();
    public DbSet<OwnedGame> OwnedGames => Set<OwnedGame>();
    public DbSet<BacklogEntry> BacklogEntries => Set<BacklogEntry>();
    public DbSet<SavedFilterView> SavedFilterViews => Set<SavedFilterView>();
    public DbSet<FavouriteProfile> FavouriteProfiles => Set<FavouriteProfile>();
    public DbSet<HowLongToBeatEntry> HowLongToBeatEntries => Set<HowLongToBeatEntry>();
    public DbSet<SteamReviewSummary> ReviewSummaries => Set<SteamReviewSummary>();
    public DbSet<StatusChange> StatusChanges => Set<StatusChange>();
    public DbSet<PlaytimeSnapshot> PlaytimeSnapshots => Set<PlaytimeSnapshot>();
    public DbSet<SteamAppDetails> AppDetails => Set<SteamAppDetails>();
    public DbSet<AchievementProgress> AchievementProgress => Set<AchievementProgress>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
