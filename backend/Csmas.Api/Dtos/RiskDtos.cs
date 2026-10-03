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

/// <summary>One labelled training example: a student's features plus whether they actually
/// dropped out (their record is Inactive).</summary>
public class AiTrainingRow : AiPredictRequest
{
    [JsonPropertyName("dropout")]
    public int Dropout { get; set; }
}

/// <summary>What the AI service reports about its current model (also returned by /train).</summary>
public class AiModelInfo
{
    [JsonPropertyName("loaded")]
    public bool Loaded { get; set; } = true;

    /// <summary>"csmas" when trained on this system's own student records; "synthetic-bootstrap"
    /// for the placeholder model baked into the image before the first real training run.</summary>
    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("trained_at")]
    public DateTime? TrainedAt { get; set; }

    [JsonPropertyName("training_rows")]
    public int TrainingRows { get; set; }

    [JsonPropertyName("dropouts")]
    public int Dropouts { get; set; }

    [JsonPropertyName("test_rows")]
    public int TestRows { get; set; }

    [JsonPropertyName("accuracy")]
    public double Accuracy { get; set; }

    [JsonPropertyName("roc_auc")]
    public double RocAuc { get; set; }

    [JsonPropertyName("precision")]
    public double? Precision { get; set; }

    [JsonPropertyName("recall")]
    public double? Recall { get; set; }

    [JsonPropertyName("feature_importances")]
    public Dictionary<string, double>? FeatureImportances { get; set; }
}

/// <summary>Browser-facing view of AiModelInfo (camelCase, unlike the snake_case AI wire format).</summary>
public record RiskModelResponse(
    bool Loaded,
    string? Source,
    DateTime? TrainedAt,
    int TrainingRows,
    int Dropouts,
    int TestRows,
    double Accuracy,
    double RocAuc,
    double? Precision,
    double? Recall,
    Dictionary<string, double>? FeatureImportances)
{
    public static RiskModelResponse From(AiModelInfo m) => new(
        m.Loaded, m.Source, m.TrainedAt, m.TrainingRows, m.Dropouts, m.TestRows,
        m.Accuracy, m.RocAuc, m.Precision, m.Recall, m.FeatureImportances);
}

public record RiskModelTrainResponse(RiskModelResponse Model, int StudentsScored);

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