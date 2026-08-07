namespace Csmas.Api.Dtos;

public record CreateSessionRequest(int ClassId, int GraceMinutes = 10);

public record SessionResponse(
    int Id,
    int ClassId,
    string Subject,
    int BranchId,
    int TeacherUserId,
    DateOnly SessionDate,
    DateTime StartedAt,
    DateTime? ClosedAt,
    string Status,
    int GraceMinutes,
    string? QrToken,
    DateTime? QrExpiresAt);

public record LiveAttendanceRow(int StudentId, string FullName, string Status, DateTime? CheckedInAt);

public record LiveAttendanceResponse(
    int SessionId,
    string SessionStatus,
    int TotalEnrolled,
    int PresentCount,
    int LateCount,
    int AbsentCount,
    int NotYetCheckedIn,
    List<LiveAttendanceRow> Students);

public record CheckInRequest(string QrToken, decimal Lat, decimal Lng);

public record CheckInResponse(string Status, double DistanceMeters);

public record ManualOverrideRequest(string Status, string Reason);

public record AttendanceFlagRow(int StudentId, string FullName, int BranchId, decimal AttendanceRate);

public record ClassPerformanceRow(int StudentId, string FullName, int SessionsCount, decimal AttendanceRatePercent);

public record ClassPerformanceResponse(int ClassId, string Subject, int WindowDays, List<ClassPerformanceRow> Students);
