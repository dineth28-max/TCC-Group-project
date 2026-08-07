namespace Csmas.Api.Dtos;

public record AttendanceTrendPoint(string Date, decimal RatePercent);

public record KpisResponse(
    int TotalStudents,
    decimal AttendanceRatePercent,
    decimal FeeCollectionRatePercent,
    int RiskFlagCount,
    bool RiskEngineEnabled,
    List<AttendanceTrendPoint> AttendanceTrend);
