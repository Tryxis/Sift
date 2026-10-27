using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class FavouriteProfileConfiguration : IEntityTypeConfiguration<FavouriteProfile>
{
    public void Configure(EntityTypeBuilder<FavouriteProfile> builder)
    {
        builder.ToTable("favourite_profiles");
        builder.HasKey(favourite => new { favourite.OwnerSteamId, favourite.SteamId });

        builder.Property(favourite => favourite.OwnerSteamId).HasMaxLength(20);
        builder.Property(favourite => favourite.SteamId).HasMaxLength(20);
        builder.Property(favourite => favourite.Alias).HasMaxLength(FavouriteProfile.AliasMaxLength);

        builder.HasOne(favourite => favourite.Owner)
            .WithMany()
            .HasForeignKey(favourite => favourite.OwnerSteamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(favourite => favourite.Profile)
            .WithMany()
            .HasForeignKey(favourite => favourite.SteamId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
