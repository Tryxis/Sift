using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFavouriteProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "favourite_profiles",
                columns: table => new
                {
                    OwnerSteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Alias = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    AddedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_favourite_profiles", x => new { x.OwnerSteamId, x.SteamId });
                    table.ForeignKey(
                        name: "FK_favourite_profiles_steam_profiles_OwnerSteamId",
                        column: x => x.OwnerSteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_favourite_profiles_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_favourite_profiles_SteamId",
                table: "favourite_profiles",
                column: "SteamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "favourite_profiles");
        }
    }
}
