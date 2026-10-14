using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHistorySnapshotsAndStoreData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NotInterested",
                table: "backlog_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "StatusChangedUtc",
                table: "backlog_entries",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "achievement_progress",
                columns: table => new
                {
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    Available = table.Column<bool>(type: "boolean", nullable: false),
                    Total = table.Column<int>(type: "integer", nullable: false),
                    Unlocked = table.Column<int>(type: "integer", nullable: false),
                    CheckedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_achievement_progress", x => new { x.SteamId, x.AppId });
                    table.ForeignKey(
                        name: "FK_achievement_progress_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_achievement_progress_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "playtime_snapshots",
                columns: table => new
                {
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    CapturedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    PlaytimeForeverMinutes = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_playtime_snapshots", x => new { x.SteamId, x.AppId, x.CapturedOn });
                    table.ForeignKey(
                        name: "FK_playtime_snapshots_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_playtime_snapshots_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "status_changes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ToStatus = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ChangedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_status_changes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_status_changes_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_status_changes_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "steam_app_details",
                columns: table => new
                {
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    Genres = table.Column<string[]>(type: "text[]", nullable: false),
                    Categories = table.Column<string[]>(type: "text[]", nullable: false),
                    Developers = table.Column<string[]>(type: "text[]", nullable: false),
                    Publishers = table.Column<string[]>(type: "text[]", nullable: false),
                    ReleaseDate = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ReleaseYear = table.Column<int>(type: "integer", nullable: true),
                    ComingSoon = table.Column<bool>(type: "boolean", nullable: false),
                    MetacriticScore = table.Column<int>(type: "integer", nullable: true),
                    MetacriticUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    DeckCompatibility = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    IsMultiplayer = table.Column<bool>(type: "boolean", nullable: false),
                    IsSingleplayer = table.Column<bool>(type: "boolean", nullable: false),
                    ShortDescription = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CheckedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_steam_app_details", x => x.AppId);
                    table.ForeignKey(
                        name: "FK_steam_app_details_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_achievement_progress_AppId",
                table: "achievement_progress",
                column: "AppId");

            migrationBuilder.CreateIndex(
                name: "IX_playtime_snapshots_AppId",
                table: "playtime_snapshots",
                column: "AppId");

            migrationBuilder.CreateIndex(
                name: "IX_status_changes_AppId",
                table: "status_changes",
                column: "AppId");

            migrationBuilder.CreateIndex(
                name: "IX_status_changes_SteamId_ChangedUtc",
                table: "status_changes",
                columns: new[] { "SteamId", "ChangedUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_steam_app_details_CheckedUtc",
                table: "steam_app_details",
                column: "CheckedUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "achievement_progress");

            migrationBuilder.DropTable(
                name: "playtime_snapshots");

            migrationBuilder.DropTable(
                name: "status_changes");

            migrationBuilder.DropTable(
                name: "steam_app_details");

            migrationBuilder.DropColumn(
                name: "NotInterested",
                table: "backlog_entries");

            migrationBuilder.DropColumn(
                name: "StatusChangedUtc",
                table: "backlog_entries");
        }
    }
}
