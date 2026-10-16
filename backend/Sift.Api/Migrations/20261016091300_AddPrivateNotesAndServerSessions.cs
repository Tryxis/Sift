using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPrivateNotesAndServerSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NotesPrivate",
                table: "backlog_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "user_sessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    SteamId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Ticket = table.Column<byte[]>(type: "bytea", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_sessions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_sessions_ExpiresUtc",
                table: "user_sessions",
                column: "ExpiresUtc");

            migrationBuilder.CreateIndex(
                name: "IX_user_sessions_SteamId",
                table: "user_sessions",
                column: "SteamId");

            // The existing cookie keys were stored unencrypted. Dropping them makes ASP.NET Core create
            // a new, encrypted key on next use. Sessions now live in user_sessions, so every existing
            // cookie (full tickets, not session keys) is invalid anyway: everyone signs in again once.
            migrationBuilder.Sql("DELETE FROM data_protection_keys;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_sessions");

            migrationBuilder.DropColumn(
                name: "NotesPrivate",
                table: "backlog_entries");
        }
    }
}
