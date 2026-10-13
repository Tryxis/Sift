using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedFilterViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "saved_filter_views",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Configuration = table.Column<string>(type: "jsonb", nullable: false),
                    IsSelected = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_saved_filter_views", x => new { x.SteamId, x.Id });
                    table.ForeignKey(
                        name: "FK_saved_filter_views_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_saved_filter_views_SteamId",
                table: "saved_filter_views",
                column: "SteamId",
                unique: true,
                filter: "\"IsSelected\" = true");

            migrationBuilder.CreateIndex(
                name: "IX_saved_filter_views_SteamId_Name",
                table: "saved_filter_views",
                columns: new[] { "SteamId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "saved_filter_views");
        }
    }
}
