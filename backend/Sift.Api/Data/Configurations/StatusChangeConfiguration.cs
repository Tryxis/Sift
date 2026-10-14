using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class StatusChangeConfiguration : IEntityTypeConfiguration<StatusChange>
{
    public void Configure(EntityTypeBuilder<StatusChange> builder)
    {
        builder.ToTable("status_changes");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.SteamId).HasMaxLength(20);
        builder.Property(c => c.FromStatus).HasConversion<string>().HasMaxLength(16);
        builder.Property(c => c.ToStatus).HasConversion<string>().HasMaxLength(16);
        builder.HasIndex(c => new { c.SteamId, c.ChangedUtc });

        builder.HasOne(c => c.Profile)
            .WithMany()
            .HasForeignKey(c => c.SteamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.App)
            .WithMany()
            .HasForeignKey(c => c.AppId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
