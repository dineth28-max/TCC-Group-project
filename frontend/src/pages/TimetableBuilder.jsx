import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import {
  listTimetableSlots,
  createTimetableSlot,
  deleteTimetableSlot,
} from "../api/timetable";
import { listClasses } from "../api/classes";
import { listBranches } from "../api/branches";
import { useAuth } from "../auth/AuthContext";
import AcademicCalendar from "../components/AcademicCalendar";
import {
  CalendarClock,
  Plus,
  Trash2,
  Calendar,
  List,
  Sparkles,
  BookOpen,
} from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function TimetableBuilder() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === "SystemAdmin";
  const [branches, setBranches] = useState([]);
  // System Admins see one branch at a time — rooms are per branch, so mixing branches in one
  // calendar makes "Hall A" at two different branches look like a double booking.
  const [branchId, setBranchId] = useState("");
  const [slots, setSlots] = useState([]);
  const [classes, setClasses] = useState([]);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "table"
  const [form, setForm] = useState({
    classId: "",
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    room: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (isSystemAdmin && !branchId) return;
    try {
      const data = await listTimetableSlots(isSystemAdmin ? { branchId } : {});
      setSlots(data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load the timetable. Please refresh the page.");
    }
  }

  useEffect(() => {
    listClasses()
      .then((data) => setClasses(data || []))
      .catch(() => setClasses([]));
    if (isSystemAdmin) {
      listBranches()
        .then((data) => {
          setBranches(data || []);
          if (data && data.length > 0) setBranchId(String(data[0].id));
        })
        .catch(() => setError("Could not load branches. Please refresh the page."));
    }
  }, [isSystemAdmin]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, isSystemAdmin]);

  const branchClasses = isSystemAdmin ? classes.filter((c) => String(c.branchId) === branchId) : classes;
  // Keep the form's class valid for the branch on screen.
  const effectiveClassId = branchClasses.some((c) => String(c.id) === String(form.classId))
    ? form.classId
    : branchClasses[0]
      ? String(branchClasses[0].id)
      : "";
  const selectedClass = branchClasses.find((c) => String(c.id) === String(effectiveClassId));

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    if (!selectedClass?.teacherUserId) {
      setError(
        "This class has no teacher assigned. Assign a teacher to the class before scheduling a slot."
      );
      return;
    }
    setLoading(true);
    try {
      await createTimetableSlot({ ...form, classId: Number(effectiveClassId) });
      await load();
      // Reset optional fields
      setForm((f) => ({ ...f, room: "" }));
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create slot — check for a conflict."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to remove this timetable slot?")) return;
    setError(null);
    try {
      await deleteTimetableSlot(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove this timetable slot.");
    }
  }

  return (
    <DashboardShell
      title="Master Timetable & Academic Calendar"
      subtitle="Schedule weekly recurring class lectures, campus hall allocations, and interactive academic sessions"
    >
      <div className="space-y-6">
        {/* View Switcher Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-[#E3EBE8] shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarClock size={18} className="text-[#00A389]" />
              <span>Timetable &amp; Schedule Manager</span>
            </h2>
            <span className="text-xs text-slate-400">
              Total active slots scheduled:{" "}
              <strong className="text-slate-800">{slots.length}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
          {isSystemAdmin && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              aria-label="Branch"
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] bg-white"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white text-[#0E483F] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar size={14} />
              <span>Interactive Calendar</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-[#0E483F] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List size={14} />
              <span>Roster Table</span>
            </button>
          </div>
          </div>
        </div>

        {/* Main Grid: View Canvas (Left) + Add Slot Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Visual Content (Calendar or Table) */}
          <div className="lg:col-span-8 space-y-6">
            {viewMode === "calendar" ? (
              <AcademicCalendar
                slots={slots}
                onDateSelect={(date, dayName) => {
                  setForm((f) => ({ ...f, dayOfWeek: dayName }));
                }}
                onRefresh={load}
              />
            ) : null}

            {/* Timetable Table (shown in table mode or as secondary ledger below calendar) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EBE8] shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Scheduled Class Slots Roster
                </h3>
                <span className="text-xs text-slate-400">
                  {slots.length} {slots.length === 1 ? "Slot" : "Slots"} Configured
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Teacher</th>
                      <th className="py-2.5 px-3">Room</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {slots.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 px-3 text-center text-slate-400 text-xs">
                          No timetable slots created yet. Use the form on the right to add one.
                        </td>
                      </tr>
                    ) : (
                      slots
                        .slice()
                        .sort(
                          (a, b) =>
                            DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) ||
                            a.startTime.localeCompare(b.startTime)
                        )
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#00A389] border border-emerald-100">
                                {s.dayOfWeek}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-slate-900 font-semibold">
                              {s.startTime} – {s.endTime}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {s.subject}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {s.teacherName ?? "Unassigned"}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {s.room || "—"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold p-1 transition cursor-pointer"
                                title="Remove slot"
                              >
                                <Trash2 size={13} />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (lg:col-span-4): Add Slot Form */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <Plus size={16} className="text-[#00A389]" />
                <span>Add Class Schedule Slot</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select a class, day, and time window. Slots update the calendar instantly.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="tt-class" className="block text-xs font-semibold text-slate-700 mb-1">
                  Class &amp; Batch
                </label>
                <select
                  id="tt-class"
                  value={effectiveClassId}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition bg-white"
                >
                  {branchClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject} — {c.teacherName ?? "No teacher assigned"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Teacher
                </label>
                <div
                  className={`w-full border rounded-xl px-3 py-2 text-xs ${
                    selectedClass?.teacherUserId
                      ? "border-slate-200 bg-slate-50 text-slate-800 font-medium"
                      : "border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  {selectedClass?.teacherName ?? "No teacher assigned — required"}
                </div>
              </div>

              <div>
                <label htmlFor="tt-day" className="block text-xs font-semibold text-slate-700 mb-1">
                  Day of Week
                </label>
                <select
                  id="tt-day"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition bg-white"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="tt-start" className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    id="tt-start"
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition"
                  />
                </div>
                <div>
                  <label htmlFor="tt-end" className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    id="tt-end"
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tt-room" className="block text-xs font-semibold text-slate-700 mb-1">
                  Room / Hall Name (optional)
                </label>
                <input
                  id="tt-room"
                  placeholder="e.g. Science Lab 02 or Main Hall A"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !selectedClass?.teacherUserId}
                className="w-full bg-[#0E483F] hover:bg-[#082C26] active:scale-[0.99] text-white rounded-xl py-3 text-xs font-bold tracking-wide transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Scheduling...</span>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Schedule Class Slot</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
