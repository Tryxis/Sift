using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "steam_apps",
                columns: table => new
                {
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    IconHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    LastUpdatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_steam_apps", x => x.AppId);
                });

            migrationBuilder.CreateTable(
                name: "steam_profiles",
                columns: table => new
                {
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PersonaName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AvatarUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    ProfileUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    IsLibraryVisible = table.Column<bool>(type: "boolean", nullable: false),
                    LastSyncedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_steam_profiles", x => x.SteamId);
                });

            migrationBuilder.CreateTable(
                name: "how_long_to_beat_entries",
                columns: table => new
                {
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    MatchStatus = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    HowLongToBeatGameId = table.Column<int>(type: "integer", nullable: true),
                    HowLongToBeatName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    MainMinutes = table.Column<int>(type: "integer", nullable: true),
                    MainExtrasMinutes = table.Column<int>(type: "integer", nullable: true),
                    CompletionistMinutes = table.Column<int>(type: "integer", nullable: true),
                    LastCheckedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_how_long_to_beat_entries", x => x.AppId);
                    table.ForeignKey(
                        name: "FK_how_long_to_beat_entries_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "steam_review_summaries",
                columns: table => new
                {
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    TotalPositive = table.Column<int>(type: "integer", nullable: false),
                    TotalNegative = table.Column<int>(type: "integer", nullable: false),
                    Rating = table.Column<double>(type: "double precision", nullable: true),
                    LastCheckedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_steam_review_summaries", x => x.AppId);
                    table.ForeignKey(
                        name: "FK_steam_review_summaries_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "backlog_entries",
                columns: table => new
                {
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    UpdatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_backlog_entries", x => new { x.SteamId, x.AppId });
                    table.ForeignKey(
                        name: "FK_backlog_entries_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_backlog_entries_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "owned_games",
                columns: table => new
                {
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppId = table.Column<int>(type: "integer", nullable: false),
                    PlaytimeForeverMinutes = table.Column<int>(type: "integer", nullable: false),
                    PlaytimeTwoWeeksMinutes = table.Column<int>(type: "integer", nullable: false),
                    LastPlayedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSyncedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_owned_games", x => new { x.SteamId, x.AppId });
                    table.ForeignKey(
                        name: "FK_owned_games_steam_apps_AppId",
                        column: x => x.AppId,
                        principalTable: "steam_apps",
                        principalColumn: "AppId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_owned_games_steam_profiles_SteamId",
                        column: x => x.SteamId,
                        principalTable: "steam_profiles",
                        principalColumn: "SteamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_backlog_entries_AppId",
                table: "backlog_entries",
                column: "AppId");

            migrationBuilder.CreateIndex(
                name: "IX_how_long_to_beat_entries_LastCheckedUtc",
                table: "how_long_to_beat_entries",
                column: "LastCheckedUtc");

            migrationBuilder.CreateIndex(
                name: "IX_owned_games_AppId",
                table: "owned_games",
                column: "AppId");

            migrationBuilder.CreateIndex(
                name: "IX_steam_review_summaries_LastCheckedUtc",
                table: "steam_review_summaries",
                column: "LastCheckedUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "backlog_entries");

            migrationBuilder.DropTable(
                name: "how_long_to_beat_entries");

            migrationBuilder.DropTable(
                name: "owned_games");

            migrationBuilder.DropTable(
                name: "steam_review_summaries");

            migrationBuilder.DropTable(
                name: "steam_profiles");

            migrationBuilder.DropTable(
                name: "steam_apps");
        }
    }
}
