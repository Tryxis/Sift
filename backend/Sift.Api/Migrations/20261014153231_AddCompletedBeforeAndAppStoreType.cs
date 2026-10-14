using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sift.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompletedBeforeAndAppStoreType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StoreType",
                table: "steam_app_details",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            // "Completed before" used to be Completed plus the played-before flag; it's now a status.
            migrationBuilder.Sql(
                """UPDATE backlog_entries SET "Status" = 'CompletedBefore' WHERE "Status" = 'Completed' AND "PlayedBefore";""");

            // Rows stored before the type was kept: mark them stale so the enrichment job refetches them.
            migrationBuilder.Sql(
                """UPDATE steam_app_details SET "CheckedUtc" = '2000-01-01T00:00:00Z' WHERE "StoreType" IS NULL;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """UPDATE backlog_entries SET "Status" = 'Completed', "PlayedBefore" = TRUE WHERE "Status" = 'CompletedBefore';""");
            migrationBuilder.Sql(
                """UPDATE backlog_entries SET "Status" = 'Backlog' WHERE "Status" = 'NotApplicable';""");
            migrationBuilder.Sql(
                """
                UPDATE status_changes SET "ToStatus" = CASE "ToStatus" WHEN 'CompletedBefore' THEN 'Completed' ELSE 'Backlog' END
                WHERE "ToStatus" IN ('CompletedBefore', 'NotApplicable');
                UPDATE status_changes SET "FromStatus" = CASE "FromStatus" WHEN 'CompletedBefore' THEN 'Completed' ELSE 'Backlog' END
                WHERE "FromStatus" IN ('CompletedBefore', 'NotApplicable');
                """);

            migrationBuilder.DropColumn(
                name: "StoreType",
                table: "steam_app_details");
        }
    }
}
