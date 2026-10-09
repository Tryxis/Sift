using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class HowLongToBeatEntryConfiguration : IEntityTypeConfiguration<HowLongToBeatEntry>
{
    public void Configure(EntityTypeBuilder<HowLongToBeatEntry> builder)
    {
        builder.ToTable("how_long_to_beat_entries");
        builder.HasKey(e => e.AppId);

        builder.Property(e => e.AppId).ValueGeneratedNever();
        builder.Property(e => e.MatchStatus).HasConversion<string>().HasMaxLength(16);
        builder.Property(e => e.HowLongToBeatName).HasMaxLength(256);
        builder.HasIndex(e => e.LastCheckedUtc);

        builder.HasOne(e => e.App)
            .WithOne()
            .HasForeignKey<HowLongToBeatEntry>(e => e.AppId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
