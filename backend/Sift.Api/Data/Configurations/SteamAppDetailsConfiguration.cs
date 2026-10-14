using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class SteamAppDetailsConfiguration : IEntityTypeConfiguration<SteamAppDetails>
{
    public void Configure(EntityTypeBuilder<SteamAppDetails> builder)
    {
        builder.ToTable("steam_app_details");
        builder.HasKey(d => d.AppId);

        builder.Property(d => d.AppId).ValueGeneratedNever();
        builder.Property(d => d.StoreType).HasMaxLength(32);
        builder.Property(d => d.Genres).HasColumnType("text[]");
        builder.Property(d => d.Categories).HasColumnType("text[]");
        builder.Property(d => d.Developers).HasColumnType("text[]");
        builder.Property(d => d.Publishers).HasColumnType("text[]");
        builder.Property(d => d.ReleaseDate).HasMaxLength(64);
        builder.Property(d => d.MetacriticUrl).HasMaxLength(512);
        builder.Property(d => d.DeckCompatibility).HasConversion<string>().HasMaxLength(16);
        builder.Property(d => d.ShortDescription).HasMaxLength(2000);
        builder.HasIndex(d => d.CheckedUtc);

        builder.HasOne(d => d.App)
            .WithOne()
            .HasForeignKey<SteamAppDetails>(d => d.AppId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
