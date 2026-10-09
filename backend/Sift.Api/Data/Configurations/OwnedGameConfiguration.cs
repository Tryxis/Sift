using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class OwnedGameConfiguration : IEntityTypeConfiguration<OwnedGame>
{
    public void Configure(EntityTypeBuilder<OwnedGame> builder)
    {
        builder.ToTable("owned_games");
        builder.HasKey(g => new { g.SteamId, g.AppId });

        builder.Property(g => g.SteamId).HasMaxLength(20);

        builder.HasOne(g => g.Profile)
            .WithMany(p => p.OwnedGames)
            .HasForeignKey(g => g.SteamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(g => g.App)
            .WithMany()
            .HasForeignKey(g => g.AppId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
