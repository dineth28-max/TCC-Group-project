import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listUsers } from "../api/users";
import { listTeacherRevenueTransactions, markTeacherEarningPaid } from "../api/payments";
import { Receipt, CheckCircle, Clock, Filter, ArrowUpRight } from "lucide-react";

const POLL_MS = 5000;

export default function AdminTeacherRevenueTransactions() {
  // The Teacher Earnings page links here pre-filtered (?teacherId=&payoutStatus=&dateFrom=&dateTo=).
  const [searchParams] = useSearchParams();
  const [teachers, setTeachers] = useState([]);
  const [filters, setFilters] = useState(() => ({
    teacherId: searchParams.get("teacherId") || "",
    payoutStatus: searchParams.get("payoutStatus") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  }));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    listUsers({ role: "Teacher" })
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, []);

  async function load() {
    const params = {};
    if (filters.teacherId) params.teacherId = filters.teacherId;
    if (filters.payoutStatus) params.payoutStatus = filters.payoutStatus;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    try {
      const data = await listTeacherRevenueTransactions(params);
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load revenue transactions. Retrying automatically...");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleMarkPaid(id) {
    if (!window.confirm("Mark this earning as paid out to the teacher? This is recorded in the audit log.")) return;
    setPayingId(id);
    try {
      await markTeacherEarningPaid(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not mark this earning as paid.");
    } finally {
      setPayingId(null);
    }
  }

  const formatCurrency = (val) =>
    `Rs ${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardShell title="Revenue Ledger">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revenue Transactions</h1>
        <p className="text-xs text-slate-500 mt-1">Audit log of tuition fee splits, teacher net payouts, and commission accruals</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="filter-teacher" className="block text-xs font-semibold text-slate-600 mb-1">
            Teacher
          </label>
          <select
            id="filter-teacher"
            value={filters.teacherId}
            onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
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
          <label htmlFor="filter-status" className="block text-xs font-semibold text-slate-600 mb-1">
            Payout Status
          </label>
          <select
            id="filter-status"
            value={filters.payoutStatus}
            onChange={(e) => setFilters({ ...filters, payoutStatus: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
          >
            <option value="">All statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-from" className="block text-xs font-semibold text-slate-600 mb-1">
            Date From
          </label>
          <input
            id="filter-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
          />
        </div>

        <div>
          <label htmlFor="filter-to" className="block text-xs font-semibold text-slate-600 mb-1">
            Date To
          </label>
          <input
            id="filter-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                <th className="py-3 px-5">Date & Time</th>
                <th className="py-3 px-5">Teacher</th>
                <th className="py-3 px-5">Gross Paid</th>
                <th className="py-3 px-5">Commission</th>
                <th className="py-3 px-5">Net Payable</th>
                <th className="py-3 px-5">Payout Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    {loading ? "Loading revenue transactions..." : "No revenue transactions found matching filters."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 text-xs text-slate-500 font-mono">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-xs text-slate-900">
                      {r.teacherName}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold text-slate-800">
                      {formatCurrency(r.grossAmount)}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-500">
                      {formatCurrency(r.commissionAmount)} ({r.commissionPercent}%)
                    </td>
                    <td className="py-3.5 px-5 text-xs font-bold text-[#2457FF]">
                      {formatCurrency(r.netAmount)}
                    </td>
                    <td className="py-3.5 px-5">
                      {r.payoutStatus === "Paid" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF3D] border border-emerald-600" />
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {r.payoutStatus !== "Paid" && (
                        <button
                          onClick={() => handleMarkPaid(r.id)}
                          disabled={payingId === r.id}
                          className="bg-blue-50 text-[#2457FF] hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >
                          {payingId === r.id ? "Saving..." : "Mark Paid"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
