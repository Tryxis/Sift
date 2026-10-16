using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Data.Configurations;

public sealed class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.ToTable("user_sessions");
        builder.HasKey(session => session.Id);

        builder.Property(session => session.Id).HasMaxLength(UserSession.IdLength).IsFixedLength();
        builder.Property(session => session.SteamId).HasMaxLength(20).IsRequired();
        builder.Property(session => session.Ticket).IsRequired();

        builder.HasIndex(session => session.SteamId);
        builder.HasIndex(session => session.ExpiresUtc);
    }
}
