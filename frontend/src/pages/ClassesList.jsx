import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listClasses, createClass, getClassRoster, updateClass } from "../api/classes";
import { listBranches } from "../api/students";
import { listUsers } from "../api/users";
import { BookOpen, Plus, Users, UserCheck } from "lucide-react";

export default function ClassesList() {
  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ subject: "", branchId: "" });
  const [error, setError] = useState(null);
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await listClasses();
      setClasses(data);
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Classes & Courses</h1>
        <p className="text-xs text-slate-500 mt-1">Configure subjects, assign faculty leads, and inspect class enrollments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Configured Subject Classes</h2>
              <span className="text-xs font-semibold text-slate-500">{classes.length} classes active</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No classes registered yet. Create one on the right.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500">
                      <th className="py-3 px-5">Subject</th>
                      <th className="py-3 px-5">Enrolled</th>
                      <th className="py-3 px-5">Teacher Lead</th>
                      <th className="py-3 px-5 text-right">Roster</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {classes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-xs text-slate-900">
                          {c.subject}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-600 font-medium">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                            <Users size={12} className="text-slate-400" />
                            {c.enrolledCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <select
                            aria-label={`Assign teacher for ${c.subject}`}
                            value={c.teacherUserId ?? ""}
                            onChange={(e) => handleAssignTeacher(c, e.target.value ? Number(e.target.value) : null)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:bg-white focus:border-[#2457FF] outline-none"
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.fullName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => showRoster(c.id)}
                            className="text-xs font-semibold text-[#2457FF] hover:underline"
                          >
                            View Roster
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Roster Preview Card */}
          {roster && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Enrolled Students in {roster.subject}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {roster.students.length} students enrolled
                </span>
              </div>
              {roster.students.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No students currently enrolled in this class roster.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                  {roster.students.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                    >
                      <span className="font-semibold text-slate-800">{s.fullName}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{s.studentCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Class Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={18} className="text-[#2457FF]" />
            <h2 className="text-sm font-bold text-slate-900">Add New Class</h2>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="class-subject" className="block text-xs font-semibold text-slate-600 mb-1">
                Subject & Grade Title
              </label>
              <input
                id="class-subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
                placeholder="e.g. Pure Mathematics Grade 12"
              />
            </div>

            <div>
              <label htmlFor="class-branch" className="block text-xs font-semibold text-slate-600 mb-1">
                Branch Campus
              </label>
              <select
                id="class-branch"
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-[#2457FF] outline-none transition"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#2457FF] hover:bg-[#1b45db] text-white rounded-xl py-2.5 text-xs font-bold transition shadow-xs shadow-blue-500/20 cursor-pointer"
            >
              Create Class
            </button>
          </form>
        </div>
      </div>
    </DashboardShell>
  );
}
