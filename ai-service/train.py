import pandas as pd
import numpy as np
import joblib
import os
from generate_data import generate_student_data
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "attendance_rate",
    "late_rate",
    "financial_issues",
    "overdue_invoice_count",
    "engagement_score",
    "semester",
    "classes_enrolled",
]
TARGET = "dropout_risk"
MODEL_DIR = "model"

def train():
    # Always regenerate — old CSV has different columns
    df = generate_student_data(1000)
    df.to_csv("student_data.csv", index=False)
    print(f"Dataset generated: {len(df)} records")

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        class_weight="balanced"
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]

    print("\n--- Model Evaluation ---")
    print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print(f"ROC-AUC  : {roc_auc_score(y_test, y_prob):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Low Risk", "High Risk"]))

    importances = model.feature_importances_
    print("\nFeature Importances:")
    for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
        print(f"  {feat:<25} {imp:.4f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model,  os.path.join(MODEL_DIR, "rf_model.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    print(f"\nModel and scaler saved to ./{MODEL_DIR}/")

if __name__ == "__main__":
    train()