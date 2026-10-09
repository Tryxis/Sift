using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class SteamReviewSummaryConfiguration : IEntityTypeConfiguration<SteamReviewSummary>
{
    public void Configure(EntityTypeBuilder<SteamReviewSummary> builder)
    {
        builder.ToTable("steam_review_summaries");
        builder.HasKey(r => r.AppId);

        builder.Property(r => r.AppId).ValueGeneratedNever();
        builder.HasIndex(r => r.LastCheckedUtc);

        builder.HasOne(r => r.App)
            .WithOne()
            .HasForeignKey<SteamReviewSummary>(r => r.AppId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
