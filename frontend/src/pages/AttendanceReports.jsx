import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listFlaggedStudents, exportAttendance } from "../api/attendance";

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReports() {
  const today = new Date();
  const [threshold, setThreshold] = useState(75);
  const [flagged, setFlagged] = useState([]);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [error, setError] = useState(null);

  async function loadFlagged() {
    try {
      setFlagged(await listFlaggedStudents(threshold));
    } catch (err) {
      setError(err.response?.data?.message || "Could not load flagged students.");
    }
  }

  useEffect(() => {
    loadFlagged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport(format) {
    try {
      const blob = await exportAttendance(year, month, format);
      downloadBlob(blob, `attendance-${year}-${String(month).padStart(2, "0")}.${format}`);
    } catch {
      setError("Export failed.");
    }
  }

  return (
    <DashboardShell title="Attendance Reports">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Below-Threshold Students</h2>
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="attendance-threshold" className="text-xs text-slate-500">Threshold %</label>
            <input
              id="attendance-threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
            />
            <button onClick={loadFlagged} className="text-xs text-violet-700 hover:underline">
              Recalculate
            </button>
          </div>
          {flagged.length === 0 ? (
            <p className="text-slate-500 text-sm">No students below the threshold.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1.5">Student</th>
                  <th className="py-1.5">Attendance Rate</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((s) => (
                  <tr key={s.studentId} className="border-t border-slate-100">
                    <td className="py-1.5">{s.fullName}</td>
                    <td className="py-1.5 text-red-600">{s.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Monthly Export</h2>
          <div className="flex gap-2 mb-4">
            <select
              aria-label="Export month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-slate-300 rounded px-2 py-1 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              aria-label="Export year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport("xlsx")} className="bg-violet-700 text-white rounded px-4 py-2 text-sm">
              Export XLSX
            </button>
            <button onClick={() => handleExport("pdf")} className="bg-slate-600 text-white rounded px-4 py-2 text-sm">
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
