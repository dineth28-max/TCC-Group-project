namespace Csmas.Api.Dtos;

public record CreateStudentRequest(
    string FullName,
    DateOnly Dob,
    string? Gender,
    string? ContactPhone,
    string? ParentName,
    string? ParentContact,
    int BranchId,
    List<int>? ClassIds,
    string? LoginEmail,
    string? LoginPassword);

public record SetStudentCredentialsRequest(string LoginEmail, string LoginPassword);

public record UpdateStudentRequest(
    string FullName,
    DateOnly Dob,
    string? Gender,
    string? ContactPhone,
    string? ParentName,
    string? ParentContact);

public record StudentSummaryResponse(
    int Id,
    string StudentCode,
    string FullName,
    DateOnly Dob,
    string? Gender,
    string? ContactPhone,
    int BranchId,
    string Status,
    DateTime CreatedAt);

public record StudentDetailResponse(
    int Id,
    string StudentCode,
    string QrPayload,
    string FullName,
    DateOnly Dob,
    string? Gender,
    string? ContactPhone,
    string? ParentName,
    string? ParentContact,
    int BranchId,
    string Status,
    string? LoginEmail,
    List<ClassSummaryResponse> Classes,
    List<StudentDocumentResponse> Documents);

public record StudentDocumentResponse(int Id, string DocType, string OriginalFileName, int FileSizeKb, DateTime UploadedAt);

public record BulkImportRowResult(int RowNumber, bool Success, string? Message, string? StudentCode);

public record BulkImportResponse(int TotalRows, int SuccessCount, List<BulkImportRowResult> Rows);

public record ParentLinkResponse(int Id, int ParentUserId, string ParentName, string ParentEmail);

public record CreateParentLinkRequest(int ParentUserId);
