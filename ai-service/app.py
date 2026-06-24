from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.get("/healthz")
def healthz():
    return jsonify(status="ok", service="ai-service"), 200


@app.post("/api/risk/predict")
def predict():
    """Phase 0 stub: model training arrives in Phase 8.
    Returns a fixed, clearly-fake response so the backend has something
    real to call end-to-end before the real model exists."""
    payload = request.get_json(silent=True) or {}
    return jsonify(
        score=0,
        riskLevel="Low",
        topFactors=["AI model not yet trained (Phase 0 stub response)"],
        receivedFeatures=payload,
    ), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
