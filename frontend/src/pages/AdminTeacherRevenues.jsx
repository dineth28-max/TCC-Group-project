import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { getTeacherRevenueSummary } from "../api/payments";

export default function AdminTeacherRevenues() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    getTeacherRevenueSummary().then(setOverview);
  }, []);

  return (
    <DashboardShell title="Teacher Revenues">
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <p className="text-xs text-slate-500 mb-1">Admin Commission Income</p>
          <p className="text-2xl font-semibold text-violet-700">
            {overview ? overview.adminCommissionIncome.toFixed(2) : "…"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <p className="text-xs text-slate-500 mb-1">Teachers With Earnings</p>
          <p className="text-2xl font-semibold text-slate-800">{overview ? overview.teachers.length : "…"}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <p className="text-xs text-slate-500 mb-1">Total Net Paid Out To Teachers</p>
          <p className="text-2xl font-semibold text-emerald-700">
            {overview ? overview.teachers.reduce((sum, t) => sum + t.totalNetEarned, 0).toFixed(2) : "…"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Transactions</th>
              <th className="px-4 py-2">Commission Generated</th>
              <th className="px-4 py-2">Net Earned</th>
            </tr>
          </thead>
          <tbody>
            {!overview || overview.teachers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-slate-500 text-xs">
                  No online-payment revenue recorded yet.
                </td>
              </tr>
            ) : (
              overview.teachers.map((t) => (
                <tr key={t.teacherUserId} className="border-t border-violet-100">
                  <td className="px-4 py-2">{t.teacherName}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{t.transactionCount}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{t.totalCommission.toFixed(2)}</td>
                  <td className="px-4 py-2 font-medium text-emerald-700">{t.totalNetEarned.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
