from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

MODEL_PATH = "model/rf_model.pkl"
SCALER_PATH = "model/scaler.pkl"

FEATURES = [
    "attendance_rate",
    "avg_grade",
    "assignments_submitted",
    "failed_modules",
    "financial_issues",
    "engagement_score",
    "semester"
]

# Load model and scaler at startup
try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("Model and scaler loaded successfully.")
except FileNotFoundError:
    model = None
    scaler = None
    print("WARNING: Model not found. Run train.py first.")


@app.route("/", methods=["GET"])
def health():
    status = "ready" if model else "model_not_loaded"
    return jsonify({"service": "AI Student Risk Engine", "status": status}), 200


@app.route("/predict", methods=["POST"])
def predict():
    if not model or not scaler:
        return jsonify({"error": "Model not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided."}), 400

    # Validate required fields
    missing = [f for f in FEATURES if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        input_vector = np.array([[data[f] for f in FEATURES]])
        input_scaled = scaler.transform(input_vector)

        prediction = model.predict(input_scaled)[0]
        probability = model.predict_proba(input_scaled)[0][1]

        risk_level = "HIGH" if prediction == 1 else "LOW"

        return jsonify({
            "student_id": data.get("student_id", "unknown"),
            "dropout_risk": int(prediction),
            "risk_level": risk_level,
            "risk_probability": round(float(probability), 4),
            "features_used": FEATURES
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    if not model or not scaler:
        return jsonify({"error": "Model not loaded. Run train.py first."}), 503

    data = request.get_json()
    if not data or "students" not in data:
        return jsonify({"error": "Expected JSON with 'students' array."}), 400

    results = []
    for student in data["students"]:
        missing = [f for f in FEATURES if f not in student]
        if missing:
            results.append({
                "student_id": student.get("student_id", "unknown"),
                "error": f"Missing fields: {missing}"
            })
            continue

        try:
            input_vector = np.array([[student[f] for f in FEATURES]])
            input_scaled = scaler.transform(input_vector)
            prediction = model.predict(input_scaled)[0]
            probability = model.predict_proba(input_scaled)[0][1]

            results.append({
                "student_id": student.get("student_id", "unknown"),
                "dropout_risk": int(prediction),
                "risk_level": "HIGH" if prediction == 1 else "LOW",
                "risk_probability": round(float(probability), 4)
            })
        except Exception as e:
            results.append({
                "student_id": student.get("student_id", "unknown"),
                "error": str(e)
            })

    return jsonify({"results": results, "total": len(results)}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
