using System.Text.Json.Serialization;

namespace Csmas.Api.Dtos;

/// <summary>
/// Body posted to the AI service's existing /predict route. Field names/casing must match
/// ai-service/app.py's FEATURES list exactly — that Flask app and its trained rf_model.pkl/
/// scaler.pkl are treated as a fixed external contract here, never modified by the backend.
/// </summary>
public class AiPredictRequest
{
    [JsonPropertyName("student_id")]
    public int StudentId { get; set; }

    [JsonPropertyName("attendance_rate")]
    public double AttendanceRate { get; set; }

    [JsonPropertyName("avg_grade")]
    public double AvgGrade { get; set; }

    [JsonPropertyName("assignments_submitted")]
    public int AssignmentsSubmitted { get; set; }

    [JsonPropertyName("failed_modules")]
    public int FailedModules { get; set; }

    [JsonPropertyName("financial_issues")]
    public int FinancialIssues { get; set; }

    [JsonPropertyName("engagement_score")]
    public double EngagementScore { get; set; }

    [JsonPropertyName("semester")]
    public int Semester { get; set; }
}

public class AiPredictResponse
{
    [JsonPropertyName("student_id")]
    public int StudentId { get; set; }

    [JsonPropertyName("dropout_risk")]
    public int DropoutRisk { get; set; }

    [JsonPropertyName("risk_level")]
    public string? RiskLevel { get; set; }

    [JsonPropertyName("risk_probability")]
    public double RiskProbability { get; set; }
}

public record RiskStudentResponse(
    int StudentId,
    string StudentCode,
    string FullName,
    int BranchId,
    string BranchName,
    int Score,
    string RiskLevel,
    List<string> TopFactors,
    DateTime ComputedAt);

public record RiskClassPredictionResponse(
    int ClassId,
    string Subject,
    int TotalStudents,
    int Succeeded,
    int Failed,
    List<RiskStudentResponse> Results);
