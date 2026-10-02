import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import {
  listTimetableSlots,
  deleteTimetableSlot,
  requestTimetableSlot,
  listTimetableSlotRequests,
} from "../api/timetable";
import { listMyClasses } from "../api/attendance";
import AcademicCalendar from "../components/AcademicCalendar";
import { CalendarClock, Plus, Calendar, List, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const STATUS_COLORS = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function TeacherWeeklyTimetable() {
  const [slots, setSlots] = useState([]);
  const [requests, setRequests] = useState([]);
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
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [s, r] = await Promise.all([
        listTimetableSlots(),
        listTimetableSlotRequests(),
      ]);
      setSlots(s || []);
      setRequests(r || []);
    } catch (err) {
      console.error("Failed to load teacher timetable:", err);
    }
  }

  useEffect(() => {
    load();
    listMyClasses().then((data) => {
      setClasses(data || []);
      if (data && data.length > 0) {
        setForm((f) => ({ ...f, classId: String(data[0].id) }));
      }
    });
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestTimetableSlot({ ...form, classId: Number(form.classId) });
      await load();
      setForm((f) => ({ ...f, room: "" }));
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not submit request — check for a conflict."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      title="Teacher Weekly Timetable & Calendar"
      subtitle="View your confirmed lecture schedule on the interactive academic calendar and submit room/slot change requests"
    >
      <div className="space-y-6">
        {/* Header Bar with View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-[#E3EBE8] shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarClock size={18} className="text-[#00A389]" />
              <span>My Teaching Schedule</span>
            </h2>
            <span className="text-xs text-slate-400">
              Assigned Weekly Sessions:{" "}
              <strong className="text-slate-800">{slots.length}</strong>
            </span>
          </div>

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
              <span>Table List</span>
            </button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Calendar & Roster Column */}
          <div className="lg:col-span-8 space-y-6">
            {viewMode === "calendar" && (
              <AcademicCalendar
                slots={slots}
                onDateSelect={(date, dayName) => {
                  setForm((f) => ({ ...f, dayOfWeek: dayName }));
                }}
                onRefresh={load}
              />
            )}

            {/* Teaching Slots Table */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E3EBE8] shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Confirmed Class Sessions
                </h3>
                <span className="text-xs text-slate-400">
                  {slots.length} Active Timetable Slots
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3">Time Window</th>
                      <th className="py-2.5 px-3">Subject / Batch</th>
                      <th className="py-2.5 px-3">Hall / Room</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {slots.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 px-3 text-center text-slate-400 text-xs">
                          No confirmed timetable slots assigned to you yet.
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
                              {s.room || "Campus Hall"}
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                Active
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Request Form & History (Right Column) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  <Plus size={16} className="text-[#00A389]" />
                  <span>Request Class Schedule Slot</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Submitted requests require administrator approval before appearing in the timetable.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                  {error}
                </div>
              )}

              {classes.length === 0 ? (
                <p className="text-slate-400 text-xs">No teaching classes assigned to you.</p>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label htmlFor="tt-class" className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Class
                    </label>
                    <select
                      id="tt-class"
                      value={form.classId}
                      onChange={(e) => setForm({ ...form, classId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition bg-white"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.subject}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tt-day" className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Day
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
                      Preferred Room / Hall (optional)
                    </label>
                    <input
                      id="tt-room"
                      placeholder="e.g. Science Lab 01"
                      value={form.room}
                      onChange={(e) => setForm({ ...form, room: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#00A389] transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-[#0E483F] hover:bg-[#082C26] active:scale-[0.99] text-white rounded-xl py-3 text-xs font-bold tracking-wide transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {busy ? "Submitting Request..." : "Submit Schedule Request"}
                  </button>
                </form>
              )}
            </div>

            {/* Requests Ledger */}
            <div className="bg-white rounded-3xl p-6 border border-[#E3EBE8] shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase">
                My Pending &amp; Past Requests
              </h4>
              {requests.length === 0 ? (
                <p className="text-slate-400 text-xs">No slot requests submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl border border-slate-200 text-xs space-y-1 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{r.subject}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        {r.dayOfWeek} {r.startTime}–{r.endTime} {r.room ? `· ${r.room}` : ""}
                      </p>
                      {r.reviewNote && (
                        <p className="text-amber-700 text-[11px] bg-amber-50 rounded-lg p-1.5 border border-amber-100">
                          Note: {r.reviewNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
