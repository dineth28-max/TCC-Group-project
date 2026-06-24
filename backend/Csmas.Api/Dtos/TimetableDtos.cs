namespace Csmas.Api.Dtos;

public record CreateTimetableSlotRequest(int ClassId, string DayOfWeek, string StartTime, string EndTime, string? Room);

public record TimetableSlotResponse(
    int Id, int ClassId, string Subject, int BranchId, string DayOfWeek,
    string StartTime, string EndTime, string? Room, int? TeacherUserId, string? TeacherName);
