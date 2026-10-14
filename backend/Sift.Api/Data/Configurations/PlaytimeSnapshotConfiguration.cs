using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class PlaytimeSnapshotConfiguration : IEntityTypeConfiguration<PlaytimeSnapshot>
{
    public void Configure(EntityTypeBuilder<PlaytimeSnapshot> builder)
    {
        builder.ToTable("playtime_snapshots");
        builder.HasKey(s => new { s.SteamId, s.AppId, s.CapturedOn });

        builder.Property(s => s.SteamId).HasMaxLength(20);
        builder.Property(s => s.CapturedOn).HasColumnType("date");

        builder.HasOne(s => s.Profile)
            .WithMany()
            .HasForeignKey(s => s.SteamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.App)
            .WithMany()
            .HasForeignKey(s => s.AppId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
