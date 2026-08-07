namespace Csmas.Api.Dtos;

public record MyProfileResponse(int Id, string StudentCode, string QrPayload, string FullName, string BranchName, List<ClassSummaryResponse> Classes);

public record AddMyParentRequest(string ParentName, string ParentEmail, string Password);
