using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class SavedFilterViewConfiguration : IEntityTypeConfiguration<SavedFilterView>
{
    public void Configure(EntityTypeBuilder<SavedFilterView> builder)
    {
        builder.ToTable("saved_filter_views");
        builder.HasKey(view => new { view.SteamId, view.Id });

        builder.Property(view => view.SteamId).HasMaxLength(20);
        builder.Property(view => view.Name).HasMaxLength(80).IsRequired();
        builder.Property(view => view.Configuration).HasColumnType("jsonb").IsRequired();

        builder.HasIndex(view => new { view.SteamId, view.Name }).IsUnique();
        builder.HasIndex(view => view.SteamId)
            .IsUnique()
            .HasFilter("\"IsSelected\" = true");

        builder.HasOne(view => view.Profile)
            .WithMany(profile => profile.SavedFilterViews)
            .HasForeignKey(view => view.SteamId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
