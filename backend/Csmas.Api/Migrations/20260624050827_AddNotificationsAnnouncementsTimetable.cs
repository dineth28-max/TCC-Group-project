using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Csmas.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationsAnnouncementsTimetable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttemptCount",
                table: "NotificationQueueItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "NotificationQueueItems",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "NotificationQueueItems",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsRead",
                table: "NotificationQueueItems",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastAttemptAt",
                table: "NotificationQueueItems",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientEmail",
                table: "NotificationQueueItems",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "SentAt",
                table: "NotificationQueueItems",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Subject",
                table: "NotificationQueueItems",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Announcements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    InstituteId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Body = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Announcements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Announcements_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "NotificationTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    InstituteId = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Subject = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Body = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationTemplates", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TimetableSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    InstituteId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    ClassId = table.Column<int>(type: "int", nullable: false),
                    DayOfWeek = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartTime = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    Room = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimetableSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimetableSlots_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TimetableSlots_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationQueueItems_RecipientUserId",
                table: "NotificationQueueItems",
                column: "RecipientUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_BranchId",
                table: "Announcements",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationTemplates_InstituteId_EventType",
                table: "NotificationTemplates",
                columns: new[] { "InstituteId", "EventType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimetableSlots_BranchId",
                table: "TimetableSlots",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TimetableSlots_ClassId",
                table: "TimetableSlots",
                column: "ClassId");

            migrationBuilder.AddForeignKey(
                name: "FK_NotificationQueueItems_Users_RecipientUserId",
                table: "NotificationQueueItems",
                column: "RecipientUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NotificationQueueItems_Users_RecipientUserId",
                table: "NotificationQueueItems");

            migrationBuilder.DropTable(
                name: "Announcements");

            migrationBuilder.DropTable(
                name: "NotificationTemplates");

            migrationBuilder.DropTable(
                name: "TimetableSlots");

            migrationBuilder.DropIndex(
                name: "IX_NotificationQueueItems_RecipientUserId",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "AttemptCount",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "IsRead",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "LastAttemptAt",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "RecipientEmail",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "SentAt",
                table: "NotificationQueueItems");

            migrationBuilder.DropColumn(
                name: "Subject",
                table: "NotificationQueueItems");
        }
    }
}
