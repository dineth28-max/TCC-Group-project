using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Csmas.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixPaymentTransactionFks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TeacherBankDetails_Users_TeacherUserId",
                table: "TeacherBankDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_TeacherEarnings_Users_TeacherUserId",
                table: "TeacherEarnings");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_InitiatedByUserId",
                table: "PaymentTransactions",
                column: "InitiatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_PaymentId",
                table: "PaymentTransactions",
                column: "PaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransactions_StudentId",
                table: "PaymentTransactions",
                column: "StudentId");

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_Payments_PaymentId",
                table: "PaymentTransactions",
                column: "PaymentId",
                principalTable: "Payments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_Students_StudentId",
                table: "PaymentTransactions",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentTransactions_Users_InitiatedByUserId",
                table: "PaymentTransactions",
                column: "InitiatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherBankDetails_Users_TeacherUserId",
                table: "TeacherBankDetails",
                column: "TeacherUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherEarnings_Users_TeacherUserId",
                table: "TeacherEarnings",
                column: "TeacherUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_Payments_PaymentId",
                table: "PaymentTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_Students_StudentId",
                table: "PaymentTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PaymentTransactions_Users_InitiatedByUserId",
                table: "PaymentTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_TeacherBankDetails_Users_TeacherUserId",
                table: "TeacherBankDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_TeacherEarnings_Users_TeacherUserId",
                table: "TeacherEarnings");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_InitiatedByUserId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_PaymentId",
                table: "PaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PaymentTransactions_StudentId",
                table: "PaymentTransactions");

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherBankDetails_Users_TeacherUserId",
                table: "TeacherBankDetails",
                column: "TeacherUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TeacherEarnings_Users_TeacherUserId",
                table: "TeacherEarnings",
                column: "TeacherUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
