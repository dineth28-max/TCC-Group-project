using System.Text.Json.Serialization;

namespace Csmas.Api.Dtos;

public class AiPredictRequest
{
    [JsonPropertyName("student_id")]
    public int StudentId { get; set; }

    /// <summary>Fraction of sessions attended (Present or Late) out of total sessions held.</summary>
    [JsonPropertyName("attendance_rate")]
    public double AttendanceRate { get; set; }

    /// <summary>Fraction of sessions where the student checked in after the grace period.</summary>
    [JsonPropertyName("late_rate")]
    public double LateRate { get; set; }

    /// <summary>1 if the student has any overdue invoice, 0 otherwise.</summary>
    [JsonPropertyName("financial_issues")]
    public int FinancialIssues { get; set; }

    /// <summary>Total number of invoices currently in Overdue status.</summary>
    [JsonPropertyName("overdue_invoice_count")]
    public int OverdueInvoiceCount { get; set; }

    /// <summary>Derived score 1–10 from attendance rate and parent portal login frequency.</summary>
    [JsonPropertyName("engagement_score")]
    public double EngagementScore { get; set; }

    /// <summary>Semester number derived from months since first enrolment (each 6 months = 1 semester).</summary>
    [JsonPropertyName("semester")]
    public int Semester { get; set; }

    /// <summary>Number of classes the student is currently enrolled in.</summary>
    [JsonPropertyName("classes_enrolled")]
    public int ClassesEnrolled { get; set; }
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