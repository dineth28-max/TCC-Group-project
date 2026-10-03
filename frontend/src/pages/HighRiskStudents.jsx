import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listRiskStudents, predictStudent, predictClass, getRiskModel, trainRiskModel } from "../api/risk";
import { listStudents } from "../api/students";
import { listBranches } from "../api/branches";
import { listClasses } from "../api/classes";
import { useAuth } from "../auth/AuthContext";
import { ShieldAlert, Search, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, Activity } from "lucide-react";

const PAGE_SIZE = 50;

const FEATURE_LABELS = {
  attendance_rate: "Attendance rate",
  late_rate: "Late rate",
  financial_issues: "Has overdue fees",
  overdue_invoice_count: "Overdue invoices",
  engagement_score: "Engagement",
  semester: "Time enrolled",
  classes_enrolled: "Classes enrolled",
};

const percent = (value) => `${Math.round((value || 0) * 1000) / 10}%`;


const LEVEL_STYLES = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
  const [model, setModel] = useState(null);
  const [modelError, setModelError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState(null);
  const [tableFilter, setTableFilter] = useState("");
  const [page, setPage] = useState(0);

  const filteredStudents = useMemo(() => {
    const term = tableFilter.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) => s.fullName.toLowerCase().includes(term) || s.studentCode.toLowerCase().includes(term));
  }, [students, tableFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedStudents = filteredStudents.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

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
          ? "The AI service is currently warming up or unavailable — try again shortly."
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
      setPage(0);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load the risk register. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadModel() {
    try {
      setModel(await getRiskModel());
      setModelError(null);
    } catch (err) {
      setModelError(err?.response?.data?.message || "Could not reach the AI service.");
    }
  }

  async function handleTrainModel() {
    if (!window.confirm("Retrain the AI model on the current student records and re-score every active student?")) return;
    setTraining(true);
    setTrainMessage(null);
    setModelError(null);
    try {
      const result = await trainRiskModel();
      setModel(result.model);
      setTrainMessage(`Model retrained on ${result.model.trainingRows} students and ${result.studentsScored} active students re-scored.`);
      load();
    } catch (err) {
      setModelError(err?.response?.data?.message || "Could not retrain the model.");
    } finally {
      setTraining(false);
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
    loadModel();
  }, []);

  useEffect(() => {
    if (user?.role === "SystemAdmin") {
      listBranches().then(setBranches).catch(() => setBranches([]));
    }
    listClasses(branchId ? { branchId } : {}).then(setClasses).catch(() => setClasses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <DashboardShell title="High-Risk Students">
      {/* Title & Description */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Academic Risk Engine</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2457FF] text-white">
            Predictive AI
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Machine-learning powered dropout & attendance risk scoring to enable early proactive interventions
        </p>
      </div>

      {/* Trained Model Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Prediction Model</h3>
            {model?.loaded === false ? (
              <p className="text-xs text-amber-700 mt-1">No model is loaded in the AI service yet.</p>
            ) : model ? (
              <p className="text-xs text-slate-500 mt-1">
                Random Forest trained{" "}
                {model.source === "csmas" ? (
                  <>
                    on <strong className="text-slate-800">{model.trainingRows}</strong> students from this system (
                    <strong className="text-slate-800">{model.dropouts}</strong> of whom left the institute)
                  </>
                ) : (
                  <span className="text-amber-700 font-semibold">on synthetic bootstrap data — retrain on your student records</span>
                )}
                {model.trainedAt && <> · {new Date(model.trainedAt).toLocaleString()}</>}
              </p>
            ) : (
              !modelError && <p className="text-xs text-slate-400 mt-1">Loading model details...</p>
            )}
          </div>
          {user?.role === "SystemAdmin" && (
            <button
              type="button"
              onClick={handleTrainModel}
              disabled={training}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-wait text-white text-xs font-semibold rounded-xl px-4 py-2 transition cursor-pointer"
            >
              {training ? "Training & re-scoring..." : "Retrain on Current Data"}
            </button>
          )}
        </div>

        {model?.loaded !== false && model && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              ["Accuracy", percent(model.accuracy)],
              ["ROC-AUC", (model.rocAuc ?? 0).toFixed(3)],
              ["Precision (dropouts)", model.precision == null ? "—" : percent(model.precision)],
              ["Recall (dropouts)", model.recall == null ? "—" : percent(model.recall)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                <div className="text-[11px] text-slate-500 font-medium">{label}</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        )}
        {model?.testRows > 0 && (
          <p className="text-[11px] text-slate-400 mt-2">Measured on {model.testRows} students held out from training.</p>
        )}

        {model?.featureImportances && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-600 mb-2">What the model relies on most</p>
            <div className="space-y-1.5">
              {Object.entries(model.featureImportances).map(([feature, weight]) => (
                <div key={feature} className="flex items-center gap-3 text-[11px]">
                  <span className="w-32 shrink-0 text-slate-600">{FEATURE_LABELS[feature] || feature}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2457FF] rounded-full" style={{ width: `${Math.round(weight * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-slate-500">{percent(weight)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modelError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 mt-3">{modelError}</p>
        )}
        {trainMessage && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mt-3">{trainMessage}</p>
        )}
      </div>

      {/* Student Lookup & Interactive Prediction Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-[#2457FF]" />
          <h3 className="font-bold text-slate-900 text-sm">On-Demand Student Risk Prediction</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="Search by student name or code (e.g. Saman)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={lookupLoading}
            className="bg-[#2457FF] hover:bg-[#1b45db] disabled:opacity-50 text-white text-xs font-semibold rounded-xl px-4 py-2 transition shadow-xs cursor-pointer"
          >
            {lookupLoading ? "Searching..." : "Find Student"}
          </button>
        </div>

        {lookupError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 mb-3">
            {lookupError}
          </p>
        )}

        {lookupResults.length > 0 && (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mb-3">
            {lookupResults.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-50 transition">
                <span className="font-medium text-slate-800">
                  <span className="font-mono text-slate-400 mr-2">{s.studentCode}</span>
                  {s.fullName}
                </span>
                <button
                  onClick={() => handlePredict(s.id)}
                  disabled={predictingId === s.id}
                  className="bg-blue-50 text-[#2457FF] hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1 font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {predictingId === s.id ? "Scoring..." : "Run AI Prediction"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {predictionResult && (
          <div className="border border-blue-100 bg-blue-50/50 rounded-2xl p-4 text-xs mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">{predictionResult.fullName}</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold border ${LEVEL_STYLES[predictionResult.riskLevel] || "bg-slate-100 text-slate-700"}`}>
                {predictionResult.riskLevel} Risk (Score: {predictionResult.score})
              </span>
            </div>
            <p className="text-slate-600 mb-2">
              The trained model estimates a <strong>{predictionResult.score}%</strong> probability that this student drops out.
            </p>
            <p className="font-semibold text-slate-600 mb-1">Key Contributing Risk Factors:</p>
            <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
              {predictionResult.topFactors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <p className="text-[11px] text-slate-400 mt-2">
              Computed: {new Date(predictionResult.computedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Filters & Class Batch Predict */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 mb-6 flex flex-wrap items-center gap-3">
        {user?.role === "SystemAdmin" && (
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setClassId("");
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
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
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.subject}</option>
          ))}
        </select>
        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
        >
          <option value="">All risk levels</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter list by name or code..."
            aria-label="Filter risk list"
            className="w-56 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:bg-white outline-none"
          />
        </div>

        <button
          onClick={handlePredictClass}
          disabled={!classId || classPredicting}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl px-4 py-2 transition ml-auto cursor-pointer"
        >
          {classPredicting ? "Scoring class..." : "Predict Entire Class"}
        </button>
      </div>

      {classPredictError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          {classPredictError}
        </div>
      )}

      {classPredictSummary && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 mb-4">
          Analyzed class <strong>{classPredictSummary.subject}</strong>: {classPredictSummary.succeeded} scored successfully out of {classPredictSummary.totalStudents} enrolled.
        </div>
      )}

      {/* Scored Students Table */}
      {error ? (
        <div className="flex items-center justify-between text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline cursor-pointer">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          Loading risk scores...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          {students.length === 0
            ? "No scored students match these filters yet. Scores update as attendance and payment records are captured."
            : "No students in this list match your filter."}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-5">Branch</th>
                  <th className="py-3 px-5">Risk Level</th>
                  <th className="py-3 px-5">Score</th>
                  <th className="py-3 px-5">Top Influencing Factors</th>
                  <th className="py-3 px-5 text-right">Computed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedStudents.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 text-xs">{s.fullName}</div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">{s.studentCode}</div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">{s.branchName}</td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${LEVEL_STYLES[s.riskLevel] || "bg-slate-100 text-slate-700"}`}>
                        {s.riskLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-800">{s.score}</td>
                    <td className="py-3.5 px-5 text-xs text-slate-600 max-w-xs">
                      <ul className="list-disc list-inside space-y-0.5">
                        {s.topFactors.map((f, i) => <li key={i} className="truncate">{f}</li>)}
                      </ul>
                    </td>
                    <td className="py-3.5 px-5 text-right text-[11px] text-slate-400">
                      {new Date(s.computedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <span>
              Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredStudents.length)} of{" "}
              {filteredStudents.length} scored students
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span>
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
