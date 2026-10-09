using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class SteamProfileConfiguration : IEntityTypeConfiguration<SteamProfile>
{
    public void Configure(EntityTypeBuilder<SteamProfile> builder)
    {
        builder.ToTable("steam_profiles");
        builder.HasKey(p => p.SteamId);

        builder.Property(p => p.SteamId).HasMaxLength(20);
        builder.Property(p => p.PersonaName).HasMaxLength(64).IsRequired();
        builder.Property(p => p.AvatarUrl).HasMaxLength(512);
        builder.Property(p => p.ProfileUrl).HasMaxLength(512);
    }
}
