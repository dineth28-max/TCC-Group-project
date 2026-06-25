import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listUsers } from "../api/users";
import { listTeacherRevenueTransactions, markTeacherEarningPaid } from "../api/payments";

const POLL_MS = 5000;

export default function AdminTeacherRevenueTransactions() {
  const [teachers, setTeachers] = useState([]);
  const [filters, setFilters] = useState({ teacherId: "", payoutStatus: "", dateFrom: "", dateTo: "" });
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listUsers({ role: "Teacher" }).then(setTeachers);
  }, []);

  async function load() {
    const params = {};
    if (filters.teacherId) params.teacherId = filters.teacherId;
    if (filters.payoutStatus) params.payoutStatus = filters.payoutStatus;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    setRows(await listTeacherRevenueTransactions(params));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleMarkPaid(id) {
    await markTeacherEarningPaid(id);
    load();
  }

  return (
    <DashboardShell title="Teacher Revenue Transactions">
      <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="filter-teacher" className="block text-xs text-slate-500 mb-1">Teacher</label>
          <select
            id="filter-teacher"
            value={filters.teacherId}
            onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="block text-xs text-slate-500 mb-1">Payout Status</label>
          <select
            id="filter-status"
            value={filters.payoutStatus}
            onChange={(e) => setFilters({ ...filters, payoutStatus: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-from" className="block text-xs text-slate-500 mb-1">From</label>
          <input
            id="filter-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="block text-xs text-slate-500 mb-1">To</label>
          <input
            id="filter-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Gross</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2">Net</th>
              <th className="px-4 py-2">Payout</th>
              <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-slate-500 text-xs">
                  No transactions match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-violet-100">
                  <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.teacherName}</td>
                  <td className="px-4 py-2 text-xs">{r.grossAmount.toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {r.commissionAmount.toFixed(2)} ({r.commissionPercent}%)
                  </td>
                  <td className="px-4 py-2 font-medium text-emerald-700">{r.netAmount.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.payoutStatus === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.payoutStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.payoutStatus !== "Paid" && (
                      <button onClick={() => handleMarkPaid(r.id)} className="text-xs text-violet-700 hover:underline">
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
