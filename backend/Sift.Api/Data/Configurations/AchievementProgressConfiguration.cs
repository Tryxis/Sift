using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class AchievementProgressConfiguration : IEntityTypeConfiguration<AchievementProgress>
{
    public void Configure(EntityTypeBuilder<AchievementProgress> builder)
    {
        builder.ToTable("achievement_progress");
        builder.HasKey(a => new { a.SteamId, a.AppId });

        builder.Property(a => a.SteamId).HasMaxLength(20);

        builder.HasOne(a => a.Profile)
            .WithMany()
            .HasForeignKey(a => a.SteamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.App)
            .WithMany()
            .HasForeignKey(a => a.AppId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
