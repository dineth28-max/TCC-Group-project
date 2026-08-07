namespace Csmas.Api.Dtos;

public record PortalChildResponse(int Id, string StudentCode, string FullName, int BranchId, string BranchName);

public record SubjectAttendanceRow(int ClassId, string Subject, int TotalSessions, int PresentCount, int LateCount, int AbsentCount, decimal RatePercent);

public record PortalAttendanceResponse(decimal OverallRatePercent, List<SubjectAttendanceRow> BySubject);

public record PortalFeeResponse(decimal TotalDue, decimal TotalPaid, List<InvoiceResponse> Invoices);
