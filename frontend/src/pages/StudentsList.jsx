import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../auth/AuthContext";
import { listStudents, deactivateStudent, reactivateStudent, listBranches } from "../api/students";
import { Search, UserPlus, Upload, X } from "lucide-react";

const PAGE_SIZE = 50;
const STATUS_OPTIONS = ["All", "Active", "Inactive"];

function initials(name) {
  if (!name) return "ST";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function errorMessage(err, fallback) {
  return err?.response?.data?.message || fallback;
}

export default function StudentsList() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === "SystemAdmin";
  const [searchParams, setSearchParams] = useSearchParams();

  // The header's global search links here with ?search=..., so the URL is the source of truth.
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);
  const [status, setStatus] = useState("All");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  useEffect(() => {
    if (!isSystemAdmin) return;
    listBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [isSystemAdmin]);

  // Live search: the list refreshes as the user types (debounced), no Enter/Filter click needed.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (status !== "All") params.status = status;
        if (branchId) params.branchId = branchId;
        const data = await listStudents(params);
        if (!cancelled) {
          setStudents(data);
          setPage(0);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Could not load students. Please try again."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, status, branchId, reloadKey]);

  function updateSearch(value) {
    setSearch(value);
    // Keep the URL in sync so the search survives a refresh / back navigation.
    setSearchParams(value ? { search: value } : {}, { replace: true });
  }

  async function handleToggleStatus(student) {
    const deactivating = student.status === "Active";
    if (deactivating && !window.confirm(`Deactivate ${student.fullName}? They will no longer be billed or marked in attendance.`)) {
      return;
    }
    setBusyId(student.id);
    setError(null);
    setNotice(null);
    try {
      if (deactivating) await deactivateStudent(student.id);
      else await reactivateStudent(student.id);
      setStudents((list) =>
        list.map((s) => (s.id === student.id ? { ...s, status: deactivating ? "Inactive" : "Active" } : s))
      );
      setNotice(`${student.fullName} was ${deactivating ? "deactivated" : "reactivated"}.`);
    } catch (err) {
      setError(errorMessage(err, `Could not ${deactivating ? "deactivate" : "reactivate"} ${student.fullName}.`));
    } finally {
      setBusyId(null);
    }
  }

  const branchName = (id) => branches.find((b) => b.id === id)?.name;
  const pageCount = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedStudents = students.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const hasFilters = search || status !== "All" || branchId;

  return (
    <DashboardShell title="Students">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Students Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage enrollments, active status, and student profiles</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/students/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 transition shadow-2xs"
          >
            <Upload size={14} className="text-slate-500" /> Bulk Import
          </Link>
          <Link
            to="/students/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2457FF] text-white hover:bg-[#1b45db] transition shadow-xs shadow-blue-500/20"
          >
            <UserPlus size={14} /> Register Student
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs mb-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 md:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by student name or student code…"
            aria-label="Search students"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2457FF] focus:ring-2 focus:ring-blue-500/10 outline-none transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => updateSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                status === option
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
          {isSystemAdmin && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              aria-label="Filter by branch"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#2457FF]"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                updateSearch("");
                setStatus("All");
                setBranchId("");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="font-semibold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
      {notice && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">{notice}</div>
      )}

      {loading && students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          Loading students directory...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          {hasFilters ? "No students found matching your search or filters." : "No students registered yet."}
        </div>
      ) : (
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-5">Student Code</th>
                  {isSystemAdmin && <th className="py-3 px-5">Branch</th>}
                  <th className="py-3 px-5">Date of Birth</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Name & Avatar */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-[#2457FF] text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(s.fullName)}
                        </div>
                        <div>
                          <Link
                            to={`/students/${s.id}`}
                            className="font-semibold text-slate-900 text-xs hover:text-[#2457FF] transition"
                          >
                            {s.fullName}
                          </Link>
                        </div>
                      </div>
                    </td>

                    {/* Student Code */}
                    <td className="py-3.5 px-5">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {s.studentCode}
                      </span>
                    </td>

                    {isSystemAdmin && (
                      <td className="py-3.5 px-5 text-xs text-slate-500">{branchName(s.branchId) || "—"}</td>
                    )}

                    {/* DOB */}
                    <td className="py-3.5 px-5 text-xs text-slate-500 font-medium">{s.dob || "—"}</td>

                    {/* Status with Lime/Emerald Tag */}
                    <td className="py-3.5 px-5">
                      {s.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#C8FF3D] border border-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        disabled={busyId === s.id}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                          s.status === "Active"
                            ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                            : "text-[#2457FF] hover:bg-blue-50"
                        }`}
                      >
                        {busyId === s.id ? "Saving..." : s.status === "Active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <span>
              Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, students.length)} of{" "}
              {students.length} students
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
