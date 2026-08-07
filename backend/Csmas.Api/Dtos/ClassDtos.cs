namespace Csmas.Api.Dtos;

public record CreateClassRequest(string Subject, int BranchId, int? TeacherUserId);

public record ClassSummaryResponse(int Id, string Subject, int BranchId, int? TeacherUserId, int EnrolledCount, string? TeacherName = null);

public record ClassRosterResponse(int ClassId, string Subject, List<StudentSummaryResponse> Students);
