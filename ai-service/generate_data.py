import pandas as pd
import numpy as np

def generate_student_data(n_samples=1000, random_state=42):
    np.random.seed(random_state)

    attendance_rate = np.random.uniform(0.3, 1.0, n_samples)
    avg_grade = np.random.uniform(30, 100, n_samples)
    assignments_submitted = np.random.randint(0, 20, n_samples)
    failed_modules = np.random.randint(0, 6, n_samples)
    financial_issues = np.random.choice([0, 1], n_samples, p=[0.75, 0.25])
    engagement_score = np.random.uniform(1, 10, n_samples)
    semester = np.random.randint(1, 9, n_samples)

    # Dropout logic: low attendance + low grades + financial issues = higher risk
    dropout_score = (
        (1 - attendance_rate) * 0.35 +
        ((100 - avg_grade) / 100) * 0.30 +
        (financial_issues * 0.15) +
        (failed_modules / 5) * 0.10 +
        ((10 - engagement_score) / 10) * 0.10
    )
    dropout = (dropout_score > 0.45).astype(int)

    df = pd.DataFrame({
        "attendance_rate": attendance_rate.round(2),
        "avg_grade": avg_grade.round(2),
        "assignments_submitted": assignments_submitted,
        "failed_modules": failed_modules,
        "financial_issues": financial_issues,
        "engagement_score": engagement_score.round(2),
        "semester": semester,
        "dropout_risk": dropout
    })

    return df

if __name__ == "__main__":
    df = generate_student_data(1000)
    df.to_csv("student_data.csv", index=False)
    print(f"Dataset generated: {len(df)} records")
    print(f"Dropout rate: {df['dropout_risk'].mean():.1%}")
    print(df.head())
