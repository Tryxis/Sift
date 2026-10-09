using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayedBeforeToBacklogEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PlayedBefore",
                table: "backlog_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlayedBefore",
                table: "backlog_entries");
        }
    }
}
