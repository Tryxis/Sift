using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFinishedHoursToBacklogEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FinishedHours",
                table: "backlog_entries",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FinishedHours",
                table: "backlog_entries");
        }
    }
}
