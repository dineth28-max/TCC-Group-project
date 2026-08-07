import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, CalendarCheck, Wallet, ShieldAlert } from "lucide-react";
import { getKpis, exportStudents } from "../api/students";
import { exportFees } from "../api/fees";
import { exportAttendance } from "../api/attendance";

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function GradientCard({ label, value, sub, icon: Icon, from, to }) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${from} ${to} text-white shadow-sm flex flex-col justify-between min-h-[110px]`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-white">{label}</p>
        <span className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
          <Icon size={18} />
        </span>
      </div>
      <div>
        <p className="text-3xl font-semibold leading-tight">{value}</p>
        {sub && <p className="text-xs text-white mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardKpis({ scopeLabel }) {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    const refresh = () => getKpis().then(setKpis).catch(() => setKpis(null));
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, []);

  async function handleExportStudents() {
    downloadBlob(await exportStudents(), "students.xlsx");
  }
  async function handleExportFees() {
    downloadBlob(await exportFees(), "fees.xlsx");
  }
  async function handleExportAttendance() {
    const now = new Date();
    downloadBlob(await exportAttendance(now.getFullYear(), now.getMonth() + 1, "xlsx"), "attendance.xlsx");
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <GradientCard
          label="Total Active Students"
          value={kpis ? kpis.totalStudents : "…"}
          sub="All branches"
          icon={Users}
          from="from-violet-600"
          to="to-purple-500"
        />
        <GradientCard
          label="Attendance Rate"
          value={kpis ? `${kpis.attendanceRatePercent}%` : "…"}
          sub="Last 30 days"
          icon={CalendarCheck}
          from="from-fuchsia-600"
          to="to-pink-500"
        />
        <GradientCard
          label="Fee Collection Rate"
          value={kpis ? `${kpis.feeCollectionRatePercent}%` : "…"}
          sub="Current period"
          icon={Wallet}
          from="from-indigo-600"
          to="to-violet-500"
        />
        <div className="rounded-xl p-4 bg-white border border-violet-100 shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">High-Risk Students</p>
            <span className="h-9 w-9 rounded-full bg-violet-50 text-violet-400 flex items-center justify-center">
              <ShieldAlert size={18} />
            </span>
          </div>
          <div>
            <p className="text-3xl font-semibold leading-tight text-slate-500">
              {kpis && kpis.riskEngineEnabled ? kpis.riskFlagCount : "—"}
            </p>
            {kpis && !kpis.riskEngineEnabled && <p className="text-xs text-slate-600 mt-0.5">AI Risk Engine arrives in Phase 8</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-violet-100 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Attendance Trend{scopeLabel ? ` — ${scopeLabel}` : ""} (last 14 days)</h2>
        {kpis && kpis.attendanceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={kpis.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="ratePercent" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-500">No closed sessions in this window yet.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-violet-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Bulk Export</h3>
        <div className="flex gap-3">
          <button onClick={handleExportStudents} className="bg-violet-50 text-violet-700 border border-violet-200 rounded px-3 py-1.5 text-xs hover:bg-violet-100">
            Export Students (.xlsx)
          </button>
          <button onClick={handleExportAttendance} className="bg-violet-50 text-violet-700 border border-violet-200 rounded px-3 py-1.5 text-xs hover:bg-violet-100">
            Export Attendance (.xlsx)
          </button>
          <button onClick={handleExportFees} className="bg-violet-50 text-violet-700 border border-violet-200 rounded px-3 py-1.5 text-xs hover:bg-violet-100">
            Export Fees (.xlsx)
          </button>
        </div>
      </div>
    </>
  );
}
