using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class BacklogEntryConfiguration : IEntityTypeConfiguration<BacklogEntry>
{
    public void Configure(EntityTypeBuilder<BacklogEntry> builder)
    {
        builder.ToTable("backlog_entries");
        builder.HasKey(e => new { e.SteamId, e.AppId });

        builder.Property(e => e.SteamId).HasMaxLength(20);
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(e => e.Notes).HasMaxLength(BacklogEntry.NotesMaxLength);
        builder.Property(e => e.PlayedBefore).HasDefaultValue(false);
        builder.Property(e => e.FinishedHours).HasPrecision(10, 2);
        builder.Property(e => e.NotInterested).HasDefaultValue(false);
        builder.Property(e => e.NotesPrivate).HasDefaultValue(false);

        builder.HasOne(e => e.Profile)
            .WithMany(p => p.BacklogEntries)
            .HasForeignKey(e => e.SteamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.App)
            .WithMany()
            .HasForeignKey(e => e.AppId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
