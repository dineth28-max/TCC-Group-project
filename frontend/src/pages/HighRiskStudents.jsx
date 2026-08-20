import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listRiskStudents, predictStudent, predictClass } from "../api/risk";
import { listStudents } from "../api/students";
import { listBranches } from "../api/branches";
import { listClasses } from "../api/classes";
import { useAuth } from "../auth/AuthContext";

const LEVEL_STYLES = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700",
};

export default function HighRiskStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [classId, setClassId] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [classPredicting, setClassPredicting] = useState(false);
  const [classPredictError, setClassPredictError] = useState(null);
  const [classPredictSummary, setClassPredictSummary] = useState(null);

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [predictingId, setPredictingId] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);

  async function handleLookup() {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setPredictionResult(null);
    try {
      const data = await listStudents({ search: lookupQuery.trim() });
      setLookupResults(data);
      if (data.length === 0) setLookupError("No matching student found.");
    } catch {
      setLookupError("Could not search students.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handlePredict(studentId) {
    setPredictingId(studentId);
    setLookupError(null);
    setPredictionResult(null);
    try {
      const result = await predictStudent(studentId);
      setPredictionResult(result);
      load();
    } catch (err) {
      setLookupError(
        err?.response?.status === 503
          ? "The AI service is unavailable right now — try again shortly."
          : "Could not run a prediction for this student."
      );
    } finally {
      setPredictingId(null);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (branchId) params.branchId = branchId;
      if (classId) params.classId = classId;
      if (riskLevel) params.riskLevel = riskLevel;
      const data = await listRiskStudents(params);
      setStudents(data);
    } catch {
      setError("Could not load high-risk students.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePredictClass() {
    if (!classId) return;
    setClassPredicting(true);
    setClassPredictError(null);
    setClassPredictSummary(null);
    try {
      const result = await predictClass(classId);
      setClassPredictSummary(result);
      load();
    } catch (err) {
      setClassPredictError(
        err?.response?.status === 503
          ? "The AI service is unavailable right now — try again shortly."
          : "Could not run predictions for this class."
      );
    } finally {
      setClassPredicting(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, classId, riskLevel]);

  useEffect(() => {
    if (user?.role === "SystemAdmin") {
      listBranches().then(setBranches).catch(() => setBranches([]));
    }
    listClasses(branchId ? { branchId } : {}).then(setClasses).catch(() => setClasses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <DashboardShell title="High-Risk Students">
      <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-4 mb-6">
        <h3 className="font-semibold text-slate-800 mb-2 text-sm">Look up a student and run a prediction now</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Type a student name or student ID…"
            className="border border-slate-300 rounded px-3 py-2 text-sm w-80"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm rounded px-4"
          >
            {lookupLoading ? "Searching…" : "Search"}
          </button>
        </div>

        {lookupError && <p className="text-red-600 text-sm mb-2">{lookupError}</p>}

        {lookupResults.length > 0 && (
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded mb-3">
            {lookupResults.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs text-slate-500 mr-2">{s.studentCode}</span>
                  {s.fullName}
                </span>
                <button
                  onClick={() => handlePredict(s.id)}
                  disabled={predictingId === s.id}
                  className="bg-violet-50 text-violet-700 border border-violet-200 rounded px-3 py-1 text-xs hover:bg-violet-100 disabled:opacity-50"
                >
                  {predictingId === s.id ? "Predicting…" : "Run Prediction"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {predictionResult && (
          <div className="border border-violet-200 bg-violet-50/50 rounded p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{predictionResult.fullName}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${LEVEL_STYLES[predictionResult.riskLevel] || "bg-slate-200 text-slate-600"}`}>
                {predictionResult.riskLevel} — {predictionResult.score}
              </span>
            </div>
            <ul className="list-disc list-inside text-slate-600 space-y-0.5">
              {predictionResult.topFactors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <p className="text-xs text-slate-400 mt-1">Computed {new Date(predictionResult.computedAt).toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {user?.role === "SystemAdmin" && (
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setClassId(""); // a class from the old branch may not exist in the new one
            }}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.subject}</option>
          ))}
        </select>
        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          <option value="">All risk levels</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <button
          onClick={handlePredictClass}
          disabled={!classId || classPredicting}
          title={!classId ? "Select a class first" : undefined}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded px-4 py-2"
        >
          {classPredicting ? "Predicting class…" : "Predict Entire Class"}
        </button>
      </div>

      {classPredictError && <p className="text-red-600 text-sm mb-3">{classPredictError}</p>}
      {classPredictSummary && (
        <p className="text-sm text-slate-600 mb-3">
          Ran the model for every student in <strong>{classPredictSummary.subject}</strong>:{" "}
          <span className="text-green-700">{classPredictSummary.succeeded} scored</span>
          {classPredictSummary.failed > 0 && (
            <span className="text-red-600"> · {classPredictSummary.failed} failed (AI service unavailable)</span>
          )}
          {" "}out of {classPredictSummary.totalStudents} enrolled.
        </p>
      )}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : students.length === 0 ? (
        <p className="text-slate-500 text-sm">No scored students yet — scores appear as attendance and payment events happen.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Student Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Branch</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Risk Level</th>
                <th className="px-4 py-2">Top Factors</th>
                <th className="px-4 py-2">Last Computed</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2 font-mono text-xs">{s.studentCode}</td>
                  <td className="px-4 py-2">
                    <Link to={`/students/${s.studentId}`} className="text-violet-700 hover:underline">
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{s.branchName}</td>
                  <td className="px-4 py-2">{s.score}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${LEVEL_STYLES[s.riskLevel] || "bg-slate-200 text-slate-600"}`}>
                      {s.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <ul className="list-disc list-inside space-y-0.5">
                      {s.topFactors.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{new Date(s.computedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
