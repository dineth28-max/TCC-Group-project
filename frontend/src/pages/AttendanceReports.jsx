import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listFlaggedStudents, exportAttendance } from "../api/attendance";
import { Download, AlertTriangle, FileSpreadsheet, FileText, Filter } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

  async function loadFlagged() {
    setLoading(true);
    try {
      setFlagged(await listFlaggedStudents(threshold));
    } catch (err) {
      setError(err.response?.data?.message || "Could not load flagged students.");
    } finally {
      setLoading(false);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Analytics & Reports</h1>
        <p className="text-xs text-slate-500 mt-1">Audit attendance adherence, filter low-rate attendees, and generate export archives</p>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flagged Students Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Below-Threshold Attendance Alerts</h2>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">Min Threshold %</span>
              <input
                id="attendance-threshold"
                type="number"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-14 bg-transparent font-bold text-slate-800 outline-none"
              />
            </div>
            <button
              onClick={loadFlagged}
              className="bg-[#2457FF] hover:bg-[#1b45db] text-white rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Filter
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading attendance logs...</p>
          ) : flagged.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No students recorded below {threshold}% attendance in this window. Excellent attendance!
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Subject Class</th>
                    <th className="py-2.5 px-3 text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flagged.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{s.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.subject}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                        {s.attendanceRatePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Download size={18} className="text-[#2457FF]" />
            <h2 className="text-sm font-bold text-slate-900">Monthly Attendance Data Export</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Month (1 - 12)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => handleExport("xlsx")}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet size={15} /> Export as Excel Workbook (.xlsx)
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileText size={15} className="text-slate-500" /> Export as CSV File (.csv)
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
