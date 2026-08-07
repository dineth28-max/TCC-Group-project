import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listStudents, deactivateStudent, reactivateStudent } from "../api/students";

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

      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name or student code…"
          className="border border-slate-300 rounded px-3 py-2 text-sm w-72"
        />
        <button onClick={load} className="bg-slate-200 hover:bg-slate-300 text-sm rounded px-4">
          Search
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : students.length === 0 ? (
        <p className="text-slate-500 text-sm">No students registered yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Student Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">DOB</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{s.studentCode}</td>
                  <td className="px-4 py-2">
                    <Link to={`/students/${s.id}`} className="text-violet-700 hover:underline">
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{s.dob}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        s.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleToggleStatus(s)}
                      className="text-xs text-slate-500 hover:text-red-600"
                    >
                      {s.status === "Active" ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
