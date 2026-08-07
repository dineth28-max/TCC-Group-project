namespace Csmas.Api.Dtos;

public record CreateAnnouncementRequest(string Title, string Body, int? BranchId);

public record AnnouncementResponse(int Id, string Title, string Body, int? BranchId, string? BranchName, string CreatedByName, DateTime CreatedAt);
