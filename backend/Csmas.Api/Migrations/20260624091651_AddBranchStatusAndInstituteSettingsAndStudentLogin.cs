using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Csmas.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchStatusAndInstituteSettingsAndStudentLogin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AttendanceThresholdPercent",
                table: "Institutes",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 75m);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Institutes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ThemeColor",
                table: "Institutes",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Branches",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttendanceThresholdPercent",
                table: "Institutes");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Institutes");

            migrationBuilder.DropColumn(
                name: "ThemeColor",
                table: "Institutes");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Branches");
        }
    }
}
