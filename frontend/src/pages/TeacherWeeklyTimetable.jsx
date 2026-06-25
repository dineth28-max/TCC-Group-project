import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listTimetableSlots, createTimetableSlot, deleteTimetableSlot } from "../api/timetable";
import { listMyClasses } from "../api/attendance";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TeacherWeeklyTimetable() {
  const [slots, setSlots] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ classId: "", dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00", room: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setSlots(await listTimetableSlots());
  }

  useEffect(() => {
    load();
    listMyClasses().then((data) => {
      setClasses(data);
      if (data.length > 0) setForm((f) => ({ ...f, classId: String(data[0].id) }));
    });
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createTimetableSlot({ ...form, classId: Number(form.classId) });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create slot — check for a conflict.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    await deleteTimetableSlot(id);
    load();
  }

  return (
    <DashboardShell title="Weekly Timetable">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-violet-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Day</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {slots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-slate-500 text-xs">
                    No timetable slots yet.
                  </td>
                </tr>
              ) : (
                slots
                  .sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime))
                  .map((s) => (
                    <tr key={s.id} className="border-t border-violet-100">
                      <td className="px-4 py-2">{s.dayOfWeek}</td>
                      <td className="px-4 py-2 font-mono text-xs">{s.startTime}–{s.endTime}</td>
                      <td className="px-4 py-2">{s.subject}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{s.room ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleDelete(s.id)} className="text-xs text-slate-500 hover:text-red-600">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Add Slot</h2>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          {classes.length === 0 ? (
            <p className="text-slate-500 text-sm">No classes assigned to you yet.</p>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="tt-class" className="block text-xs text-slate-500 mb-1">Class</label>
                <select
                  id="tt-class"
                  value={form.classId}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tt-day" className="block text-xs text-slate-500 mb-1">Day</label>
                <select
                  id="tt-day"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="tt-start" className="block text-xs text-slate-500 mb-1">Start</label>
                  <input
                    id="tt-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="tt-end" className="block text-xs text-slate-500 mb-1">End</label>
                  <input
                    id="tt-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="tt-room" className="block text-xs text-slate-500 mb-1">Room (optional)</label>
                <input
                  id="tt-room"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
              >
                Add Slot
              </button>
            </form>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
