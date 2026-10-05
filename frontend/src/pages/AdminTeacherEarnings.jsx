import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { getTeacherRevenueSummary } from "../api/payments";
import { Wallet, Clock, Landmark, Eye, EyeOff, Search, X } from "lucide-react";

const PRESETS = ["This Month", "Last Month", "Last 6 Months", "This Year"];

function initials(name) {
  if (!name) return "TR";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Local-date yyyy-MM-dd (toISOString would shift the day for UTC+ timezones like Sri Lanka).
function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function presetRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "Last Month":
      return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "Last 6 Months":
      return { from: isoDate(new Date(y, m - 5, 1)), to: isoDate(now) };
    case "This Year":
      return { from: isoDate(new Date(y, 0, 1)), to: isoDate(now) };
    default:
      return { from: isoDate(new Date(y, m, 1)), to: isoDate(now) };
  }
}

function formatDisplayDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const formatCurrency = (val) =>
  `Rs ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function AdminTeacherEarnings() {
  const initialRange = presetRange("This Month");
  const [activeFilter, setActiveFilter] = useState("This Month");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showValues, setShowValues] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const rangeInvalid = fromDate && toDate && fromDate > toDate;

  useEffect(() => {
    if (rangeInvalid) return undefined;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTeacherRevenueSummary({ from: fromDate || undefined, to: toDate || undefined });
        if (!cancelled) setRows(data.teachers);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || "Could not load teacher earnings. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, rangeInvalid, reloadKey]);

  function applyPreset(preset) {
    const range = presetRange(preset);
    setActiveFilter(preset);
    setFromDate(range.from);
    setToDate(range.to);
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) => r.teacherName.toLowerCase().includes(term) || (r.branchName || "").toLowerCase().includes(term)
    );
  }, [rows, search]);

  const totals = visibleRows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.totalGross,
      net: acc.net + r.totalNetEarned,
      commission: acc.commission + r.totalCommission,
      unpaid: acc.unpaid + r.unpaidNet,
      payments: acc.payments + r.transactionCount,
    }),
    { gross: 0, net: 0, commission: 0, unpaid: 0, payments: 0 }
  );

  const masked = (value) => (showValues ? formatCurrency(value) : "••••••••");

  // Opens the ledger filtered to the same teacher and period, so its rows add up to this row.
  function ledgerLink(row) {
    const params = new URLSearchParams({ teacherId: String(row.teacherUserId) });
    if (row.unpaidNet > 0) params.set("payoutStatus", "Unpaid");
    if (fromDate) params.set("dateFrom", fromDate);
    if (toDate) params.set("dateTo", toDate);
    return `/teacher-revenue-transactions?${params}`;
  }

  const cards = [
    { label: "Teacher Earnings", hint: "Net of commission", value: totals.net, icon: Wallet, dot: "bg-[#2457FF]", iconBox: "bg-blue-50 text-[#2457FF]" },
    { label: "Still Owed to Teachers", hint: "Not yet paid out", value: totals.unpaid, icon: Clock, dot: "bg-amber-500", iconBox: "bg-amber-50 text-amber-600" },
    { label: "Institute Commission", hint: "Kept by institute", value: totals.commission, icon: Landmark, dot: "bg-[#C8FF3D] border border-slate-400", iconBox: "bg-purple-50 text-purple-600" },
  ];

  return (
    <DashboardShell title="Teacher Earnings">
      {/* Page Title & Subheading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Earnings</h1>
        <p className="text-sm text-slate-500 mt-1">
          What each teacher earned from online fee payments, and how much is still waiting to be paid out
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            {PRESETS.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => applyPreset(pill)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  activeFilter === pill ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">From</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActiveFilter(null);
                }}
                className="bg-transparent text-slate-700 outline-none font-medium cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActiveFilter(null);
                }}
                className="bg-transparent text-slate-700 outline-none font-medium cursor-pointer"
              />
            </label>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher or branch..."
              aria-label="Search teachers"
              className="w-56 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs outline-none focus:bg-white focus:border-[#2457FF]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium self-start xl:self-center">
          For the period:{" "}
          <span className="text-slate-700 font-semibold">
            {fromDate ? formatDisplayDate(fromDate) : "the beginning"} – {toDate ? formatDisplayDate(toDate) : "today"}
          </span>
        </div>
      </div>

      {rangeInvalid && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          The "From" date must be on or before the "To" date.
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* KPI / Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-[#2457FF]/30 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${card.dot}`} />
                <span className="text-xs font-semibold text-slate-600">{card.label}</span>
              </div>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${card.iconBox}`}>
                <card.icon size={16} />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{loading ? "…" : masked(card.value)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{card.hint}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowValues(!showValues)}
                title={showValues ? "Hide amounts" : "Show amounts"}
                aria-label={showValues ? "Hide amounts" : "Show amounts"}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                {showValues ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
        {visibleRows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {loading
              ? "Loading teacher earnings..."
              : search
                ? "No teachers match your search."
                : "No teacher earned from online payments in this period. Counter (cash) payments aren't split, so they don't appear here."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Teacher</th>
                  <th className="py-3 px-5">Online Payments</th>
                  <th className="py-3 px-5">Commission</th>
                  <th className="py-3 px-5">Net Earned</th>
                  <th className="py-3 px-5">Still Owed</th>
                  <th className="py-3 px-5 text-right">Payments</th>
                  <th className="py-3 px-5 text-right">Payouts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {visibleRows.map((row) => (
                  <tr key={row.teacherUserId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {initials(row.teacherName)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{row.teacherName || "Unknown teacher"}</div>
                          {row.branchName && <div className="text-[11px] text-slate-400 mt-0.5">{row.branchName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">{masked(row.totalGross)}</td>
                    <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">{masked(row.totalCommission)}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        {masked(row.totalNetEarned)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      {row.unpaidNet > 0 ? (
                        <span className="inline-flex items-center font-semibold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          {masked(row.unpaidNet)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Fully paid</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right text-xs text-slate-500 font-medium">{row.transactionCount}</td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        to={ledgerLink(row)}
                        className="inline-block bg-blue-50 text-[#2457FF] hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                      >
                        {row.unpaidNet > 0 ? "Pay out" : "View ledger"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-800">
                  <td className="py-3.5 px-5 text-slate-500">{visibleRows.length} teachers</td>
                  <td className="py-3.5 px-5 font-bold text-slate-900">{masked(totals.gross)}</td>
                  <td className="py-3.5 px-5 font-bold text-slate-900">{masked(totals.commission)}</td>
                  <td className="py-3.5 px-5 font-bold text-slate-900">{masked(totals.net)}</td>
                  <td className="py-3.5 px-5 font-bold text-slate-900">{masked(totals.unpaid)}</td>
                  <td className="py-3.5 px-5 text-right font-bold text-slate-900">{totals.payments}</td>
                  <td className="py-3.5 px-5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
