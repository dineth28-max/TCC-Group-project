import pandas as pd
import numpy as np

def generate_student_data(n_samples=1000, random_state=42):
    np.random.seed(random_state)

    # --- Real features (all sourced from CSMAS live data) ---
    attendance_rate      = np.random.uniform(0.3, 1.0, n_samples)
    late_rate            = np.clip(np.random.beta(2, 8, n_samples), 0.0, 0.5)   # skewed low: most students rarely late
    financial_issues     = np.random.choice([0, 1], n_samples, p=[0.75, 0.25])
    overdue_invoice_count = np.where(
        financial_issues == 1,
        np.random.randint(1, 5, n_samples),   # if financial issues → 1-4 overdue invoices
        0
    )
    engagement_score     = np.clip(
        np.round(attendance_rate * 6.0 + np.random.uniform(0, 4, n_samples), 1),
        1.0, 10.0
    )
    semester             = np.random.randint(1, 9, n_samples)
    classes_enrolled     = np.random.randint(1, 6, n_samples)

    # --- Dropout label logic (reflects real CSMAS signals only) ---
    dropout_score = (
        (1 - attendance_rate)                    * 0.35 +   # strongest signal
        late_rate                                * 0.15 +   # frequent lateness also risky
        (financial_issues * 0.20)               +           # overdue fee = strong dropout predictor
        (overdue_invoice_count / 5)              * 0.10 +   # more overdue → higher risk
        ((10 - engagement_score) / 10)           * 0.15 +   # low engagement = disengaged
        (1 / classes_enrolled)                   * 0.05     # enrolled in fewer classes = less committed
    )
    dropout = (dropout_score > 0.42).astype(int)

    df = pd.DataFrame({
        "attendance_rate":       np.round(attendance_rate, 3),
        "late_rate":             np.round(late_rate, 3),
        "financial_issues":      financial_issues,
        "overdue_invoice_count": overdue_invoice_count,
        "engagement_score":      np.round(engagement_score, 1),
        "semester":              semester,
        "classes_enrolled":      classes_enrolled,
        "dropout_risk":          dropout
    })

    return df

if __name__ == "__main__":
    df = generate_student_data(1000)
    df.to_csv("student_data.csv", index=False)
    print(f"Dataset generated: {len(df)} records")
    print(f"Dropout rate: {df['dropout_risk'].mean():.1%}")
    print(df.head())