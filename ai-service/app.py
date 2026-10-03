import json
import os
import tempfile
import threading
from datetime import datetime, timezone

import joblib
import numpy as np
from flask import Flask, jsonify, request
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)

MODEL_DIR = os.environ.get("MODEL_DIR", "model")
MODEL_PATH = os.path.join(MODEL_DIR, "rf_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
META_PATH = os.path.join(MODEL_DIR, "meta.json")

# Must match train.py FEATURES exactly — order matters for the scaler
FEATURES = [
    "attendance_rate",
    "late_rate",
    "financial_issues",
    "overdue_invoice_count",
    "engagement_score",
    "semester",
    "classes_enrolled",
]
TARGET = "dropout"

# Minimum training set the /train endpoint will accept — below this the held-out evaluation
# is meaningless and the forest would just memorise a handful of students.
MIN_ROWS = 50
MIN_PER_CLASS = 10

_lock = threading.Lock()
_state = {"model": None, "scaler": None, "meta": None, "mtime": None}


def _meta_mtime():
    try:
        return os.path.getmtime(META_PATH)
    except OSError:
        return None


def _load_model():
    """(Re)load model + scaler + metadata from disk. Gunicorn runs several worker processes, so a
    model retrained by one worker is picked up by the others via the metadata file's mtime."""
    with _lock:
        mtime = _meta_mtime()
        if _state["model"] is not None and mtime == _state["mtime"]:
            return
        try:
            model = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
        except FileNotFoundError:
            print("WARNING: Model not found. Run train.py or POST /train first.")
            return
        meta = {}
        if os.path.exists(META_PATH):
            with open(META_PATH, encoding="utf-8") as f:
                meta = json.load(f)
        _state.update(model=model, scaler=scaler, meta=meta, mtime=mtime)
        print(f"Model loaded (source={meta.get('source', 'unknown')}, trained_at={meta.get('trained_at')}).")


def _model():
    _load_model()
    return _state["model"], _state["scaler"]


def _atomic_dump(obj, path, writer):
    fd, tmp = tempfile.mkstemp(dir=MODEL_DIR, suffix=".tmp")
    os.close(fd)
    writer(obj, tmp)
    os.replace(tmp, path)


def _write_json(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def _vector(record):
    return [float(record[f]) for f in FEATURES]


def _predict_one(model, scaler, record):
    scaled = scaler.transform(np.array([_vector(record)]))
    prediction = int(model.predict(scaled)[0])
    probability = float(model.predict_proba(scaled)[0][1])
    return prediction, probability


@app.route("/", methods=["GET"])
def health():
    model, _ = _model()
    return jsonify({"service": "AI Student Risk Engine", "status": "ready" if model else "model_not_loaded"}), 200


@app.route("/model-info", methods=["GET"])
def model_info():
    model, _ = _model()
    if not model:
        return jsonify({"loaded": False}), 200
    return jsonify({"loaded": True, **(_state["meta"] or {})}), 200


@app.route("/train", methods=["POST"])
def train():
    """Train the Random Forest on real CSMAS student records sent by the backend.

    Body: {"rows": [{<FEATURES...>, "dropout": 0|1}, ...]}
    The model is evaluated on a stratified 20% hold-out before being saved, and the evaluation is
    stored with the model so the UI can show how trustworthy it is.
    """
    data = request.get_json(silent=True) or {}
    rows = data.get("rows")
    if not isinstance(rows, list):
        return jsonify({"error": "Expected JSON with a 'rows' array."}), 400

    try:
        X = np.array([_vector(r) for r in rows])
        y = np.array([int(r[TARGET]) for r in rows])
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": f"Every row needs {FEATURES + [TARGET]} as numbers ({e})."}), 400

    positives = int(y.sum())
    negatives = int(len(y) - positives)
    if len(rows) < MIN_ROWS or positives < MIN_PER_CLASS or negatives < MIN_PER_CLASS:
        return jsonify({
            "error": f"Not enough data to train: need at least {MIN_ROWS} students including "
                     f"{MIN_PER_CLASS} who dropped out and {MIN_PER_CLASS} who did not "
                     f"(got {len(rows)} students, {positives} dropouts)."
        }), 422

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]

    meta = {
        "source": "csmas",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_rows": len(rows),
        "dropouts": positives,
        "test_rows": int(len(y_test)),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "feature_importances": {
            f: round(float(i), 4) for f, i in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
        },
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    with _lock:
        _atomic_dump(model, MODEL_PATH, joblib.dump)
        _atomic_dump(scaler, SCALER_PATH, joblib.dump)
        # Metadata last: its mtime is the "new model available" signal for the other workers.
        _atomic_dump(meta, META_PATH, _write_json)
        _state.update(model=model, scaler=scaler, meta=meta, mtime=_meta_mtime())

    print(f"Model retrained on {len(rows)} CSMAS students: accuracy={meta['accuracy']}, roc_auc={meta['roc_auc']}")
    return jsonify(meta), 200


@app.route("/predict", methods=["POST"])
def predict():
    model, scaler = _model()
    if not model or not scaler:
        return jsonify({"error": "Model not loaded. Run train.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No JSON body provided."}), 400

    missing = [f for f in FEATURES if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        prediction, probability = _predict_one(model, scaler, data)
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid feature values: {e}"}), 400

    return jsonify({
        "student_id": data.get("student_id", "unknown"),
        "dropout_risk": prediction,
        "risk_level": "HIGH" if prediction == 1 else "LOW",
        "risk_probability": round(probability, 4),
        "features_used": FEATURES,
    }), 200


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    model, scaler = _model()
    if not model or not scaler:
        return jsonify({"error": "Model not loaded. Run train.py first."}), 503

    data = request.get_json(silent=True)
    if not data or not isinstance(data.get("students"), list):
        return jsonify({"error": "Expected JSON with 'students' array."}), 400

    results = []
    for student in data["students"]:
        missing = [f for f in FEATURES if f not in student]
        if missing:
            results.append({"student_id": student.get("student_id", "unknown"), "error": f"Missing fields: {missing}"})
            continue
        try:
            prediction, probability = _predict_one(model, scaler, student)
            results.append({
                "student_id": student.get("student_id", "unknown"),
                "dropout_risk": prediction,
                "risk_level": "HIGH" if prediction == 1 else "LOW",
                "risk_probability": round(probability, 4),
            })
        except (TypeError, ValueError) as e:
            results.append({"student_id": student.get("student_id", "unknown"), "error": str(e)})

    return jsonify({"results": results, "total": len(results)}), 200


_load_model()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
