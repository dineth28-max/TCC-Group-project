import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listClasses, createClass, getClassRoster, updateClass } from "../api/classes";
import { listBranches } from "../api/students";
import { listUsers } from "../api/users";

export default function ClassesList() {
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ subject: "", branchId: "" });
  const [error, setError] = useState(null);
  const [roster, setRoster] = useState(null);

  async function load() {
    setClasses(await listClasses());
  }

  useEffect(() => {
    load();
    listBranches().then((data) => {
      setBranches(data);
      if (data.length > 0) setForm((f) => ({ ...f, branchId: String(data[0].id) }));
    });
    listUsers({ role: "Teacher" }).then(setTeachers);
  }, []);

  async function handleAssignTeacher(klass, teacherUserId) {
    await updateClass(klass.id, { subject: klass.subject, branchId: klass.branchId, teacherUserId: teacherUserId || null });
    load();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await createClass({ subject: form.subject, branchId: Number(form.branchId), teacherUserId: null });
      setForm((f) => ({ ...f, subject: "" }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create class.");
    }
  }

  async function showRoster(classId) {
    setRoster(await getClassRoster(classId));
  }

  return (
    <DashboardShell title="Classes">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">All Classes</h2>
          {classes.length === 0 ? (
            <p className="text-slate-500 text-sm">No classes yet — create one on the right.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1.5">Subject</th>
                  <th className="py-1.5">Enrolled</th>
                  <th className="py-1.5">Teacher</th>
                  <th className="py-1.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="py-1.5">{c.subject}</td>
                    <td className="py-1.5">{c.enrolledCount}</td>
                    <td className="py-1.5">
                      <select
                        aria-label={`Assign teacher for ${c.subject}`}
                        value={c.teacherUserId ?? ""}
                        onChange={(e) => handleAssignTeacher(c, e.target.value ? Number(e.target.value) : null)}
                        className="border border-slate-300 rounded px-2 py-1 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => showRoster(c.id)} className="text-xs text-violet-700 hover:underline">
                        View roster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {roster && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="font-medium text-sm text-slate-700 mb-2">Roster: {roster.subject}</h3>
              {roster.students.length === 0 ? (
                <p className="text-xs text-slate-500">No students enrolled.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {roster.students.map((s) => (
                    <li key={s.id}>
                      {s.fullName} <span className="text-slate-500 font-mono text-xs">({s.studentCode})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Create Class</h2>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label htmlFor="class-subject" className="block text-xs text-slate-500 mb-1">Subject</label>
              <input
                id="class-subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="class-branch" className="block text-xs text-slate-500 mb-1">Branch</label>
              <select
                id="class-branch"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full">
              Create
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
