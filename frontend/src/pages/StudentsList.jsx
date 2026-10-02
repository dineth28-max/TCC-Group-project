import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listStudents, deactivateStudent, reactivateStudent } from "../api/students";
import { Search, UserPlus, Upload, Users, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";

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

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listStudents(search ? { search } : {});
      setStudents(data);
    } catch {
      setError("Could not load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleStatus(student) {
    if (student.status === "Active") {
      await deactivateStudent(student.id);
    } else {
      await reactivateStudent(student.id);
    }
    load();
  }

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

      {/* Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs mb-6 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search by student name or student code…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2457FF] focus:ring-2 focus:ring-blue-500/10 outline-none transition"
          />
        </div>
        <button
          onClick={load}
          className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl px-4 py-2 transition"
        >
          Filter
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          Loading students directory...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-xs text-slate-400">
          No students found matching your criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-5">Student Code</th>
                  <th className="py-3 px-5">Date of Birth</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((s) => (
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

                    {/* DOB */}
                    <td className="py-3.5 px-5 text-xs text-slate-500 font-medium">
                      {s.dob || "—"}
                    </td>

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
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                          s.status === "Active"
                            ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                            : "text-[#2457FF] hover:bg-blue-50"
                        }`}
                      >
                        {s.status === "Active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium">
            Showing {students.length} students enrolled
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
