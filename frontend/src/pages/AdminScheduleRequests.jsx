import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { listTimetableSlotRequests, approveTimetableSlotRequest, rejectTimetableSlotRequest } from "../api/timetable";

const STATUS_COLORS = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function AdminScheduleRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("Pending");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setError(null);
    try {
      const data = await listTimetableSlotRequests(status ? { status } : {});
      setRequests(data);
    } catch {
      setError("Could not load schedule requests.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleApprove(id) {
    setBusyId(id);
    setError(null);
    try {
      await approveTimetableSlotRequest(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not approve this request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    const note = window.prompt("Reason for rejecting (optional):") || undefined;
    setBusyId(id);
    setError(null);
    try {
      await rejectTimetableSlotRequest(id, note);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not reject this request.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = requests.filter((r) => r.requestedByName.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardShell title="Schedule Requests">
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by teacher name…"
          className="border border-slate-300 rounded px-3 py-2 text-sm w-64"
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="bg-white rounded-lg shadow-sm border border-violet-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Day / Time</th>
              <th className="px-4 py-2">Room</th>
              <th className="px-4 py-2">Requested</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-slate-500 text-xs">
                  No schedule requests found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-violet-100">
                  <td className="px-4 py-2">{r.requestedByName}</td>
                  <td className="px-4 py-2">{r.subject}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.dayOfWeek} {r.startTime}–{r.endTime}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.room ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.requestedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {r.status === "Pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={busyId === r.id}
                          className="text-xs text-emerald-700 hover:text-emerald-900 mr-3 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={busyId === r.id}
                          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
