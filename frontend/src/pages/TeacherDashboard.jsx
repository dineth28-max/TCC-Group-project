import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import DashboardShell from "./DashboardShell";
import {
  listMyClasses,
  listSessions,
  createSession,
  regenerateQr,
  getLiveAttendance,
  overrideAttendance,
  closeSession,
  getClassPerformance,
} from "../api/attendance";

const LIVE_POLL_MS = 5000;
const TODAY = new Date().toISOString().slice(0, 10);

export default function TeacherDashboard() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [recentSessions, setRecentSessions] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [live, setLive] = useState(null);
  const [error, setError] = useState(null);
  const [overrideReason, setOverrideReason] = useState({});
  const [minutesLeft, setMinutesLeft] = useState(null);
  const pollRef = useRef(null);
  const qrTickRef = useRef(null);

  useEffect(() => {
    listMyClasses().then((data) => {
      setClasses(data);
      if (data.length > 0) setSelectedClassId(String(data[0].id));
    });
    listSessions().then((all) => setTodaySessions(all.filter((s) => s.sessionDate === TODAY)));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    listSessions(selectedClassId).then(setRecentSessions);
    getClassPerformance(selectedClassId).then(setPerformance);
  }, [selectedClassId]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "Open") {
      clearInterval(pollRef.current);
      return;
    }
    const poll = () => getLiveAttendance(activeSession.id).then(setLive).catch(() => {});
    poll();
    pollRef.current = setInterval(poll, LIVE_POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [activeSession]);

  useEffect(() => {
    clearInterval(qrTickRef.current);
    if (!activeSession?.qrExpiresAt || activeSession.status !== "Open") {
      setMinutesLeft(null);
      return;
    }
    const tick = () => {
      setMinutesLeft(Math.max(0, Math.round((new Date(activeSession.qrExpiresAt) - Date.now()) / 60000)));
    };
    tick();
    qrTickRef.current = setInterval(tick, 30000);
    return () => clearInterval(qrTickRef.current);
  }, [activeSession]);

  async function handleCreateSession() {
    setError(null);
    try {
      const session = await createSession({ classId: Number(selectedClassId), graceMinutes: 10 });
      setActiveSession(session);
      setRecentSessions((prev) => [session, ...prev]);
      if (session.sessionDate === TODAY) setTodaySessions((prev) => [session, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create session.");
    }
  }

  async function handleRegenerateQr() {
    const updated = await regenerateQr(activeSession.id);
    setActiveSession(updated);
  }

  async function handleOverride(studentId, status) {
    const reason = overrideReason[studentId];
    if (!reason || !reason.trim()) {
      setError("A reason is required for a manual override.");
      return;
    }
    setError(null);
    try {
      await overrideAttendance(activeSession.id, studentId, { status, reason });
      const refreshed = await getLiveAttendance(activeSession.id);
      setLive(refreshed);
      setOverrideReason((prev) => ({ ...prev, [studentId]: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Override failed.");
    }
  }

  async function handleClose() {
    await closeSession(activeSession.id);
    const refreshed = await getLiveAttendance(activeSession.id);
    setLive(refreshed);
    setActiveSession((prev) => ({ ...prev, status: "Closed" }));
  }

  return (
    <DashboardShell title="Teacher Dashboard">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Start a Session</h2>
          {classes.length === 0 ? (
            <p className="text-slate-500 text-sm">No classes assigned to you yet.</p>
          ) : (
            <>
              <label htmlFor="teacher-class" className="block text-xs text-slate-500 mb-1">Class</label>
              <select
                id="teacher-class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject} ({c.enrolledCount} enrolled)
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateSession}
                className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full"
              >
                Generate QR &amp; Open Session
              </button>
            </>
          )}

          {recentSessions.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-medium text-slate-500 mb-2">Recent sessions</h3>
              <ul className="text-sm space-y-1">
                {recentSessions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSession(s)}
                      className="text-violet-700 hover:underline"
                    >
                      {s.sessionDate} — {s.status}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6 flex flex-col items-center justify-center">
          {activeSession ? (
            <>
              <h2 className="font-semibold text-slate-800 mb-2">{activeSession.subject}</h2>
              {activeSession.status === "Open" ? (
                <>
                  <QRCodeSVG value={activeSession.qrToken} size={180} />
                  <p className="text-xs text-slate-500 mt-2">
                    Expires in {minutesLeft} min{minutesLeft === 1 ? "" : "s"}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleRegenerateQr} className="text-xs text-violet-700 hover:underline">
                      Regenerate QR
                    </button>
                    <button onClick={handleClose} className="text-xs text-red-600 hover:underline">
                      Close session
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Session closed.</p>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">No active session selected.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Live Attendance</h2>
          {!live ? (
            <p className="text-slate-500 text-sm">Open a session to see live counts.</p>
          ) : (
            <>
              <div className="flex gap-3 mb-4 text-center">
                <div className="flex-1 bg-emerald-50 rounded p-2">
                  <div className="text-lg font-semibold text-emerald-700">{live.presentCount}</div>
                  <div className="text-xs text-emerald-600">Present</div>
                </div>
                <div className="flex-1 bg-amber-50 rounded p-2">
                  <div className="text-lg font-semibold text-amber-700">{live.lateCount}</div>
                  <div className="text-xs text-amber-600">Late</div>
                </div>
                <div className="flex-1 bg-red-50 rounded p-2">
                  <div className="text-lg font-semibold text-red-700">{live.absentCount}</div>
                  <div className="text-xs text-red-600">Absent</div>
                </div>
              </div>
              <ul className="text-sm space-y-2 max-h-80 overflow-y-auto">
                {live.students.map((s) => (
                  <li key={s.studentId} className="border-t border-slate-100 pt-2">
                    <div className="flex justify-between items-center">
                      <span>{s.fullName}</span>
                      <span className="text-xs text-slate-500">{s.status}</span>
                    </div>
                    {activeSession?.status === "Open" && (
                      <div className="flex gap-1 mt-1">
                        <input
                          placeholder="Override reason"
                          value={overrideReason[s.studentId] || ""}
                          onChange={(e) =>
                            setOverrideReason((prev) => ({ ...prev, [s.studentId]: e.target.value }))
                          }
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => handleOverride(s.studentId, "Present")}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleOverride(s.studentId, "Absent")}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Absent
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Today's Sessions</h2>
          {todaySessions.length === 0 ? (
            <p className="text-slate-500 text-sm">No sessions opened today yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {todaySessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span>{s.subject}</span>
                  <span className={`text-xs ${s.status === "Open" ? "text-emerald-600" : "text-slate-500"}`}>{s.status}</span>
                  <button onClick={() => setActiveSession(s)} className="text-xs text-violet-700 hover:underline">
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">
            Class Performance {performance ? `— ${performance.subject}` : ""}
            <span className="text-xs text-slate-500 font-normal"> (avg. attendance, last 4 weeks)</span>
          </h2>
          {!performance || performance.students.length === 0 ? (
            <p className="text-slate-500 text-sm">No performance data yet for this class.</p>
          ) : (
            <ul className="text-sm space-y-1.5 max-h-72 overflow-y-auto">
              {performance.students.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                  <span>{s.fullName}</span>
                  <span
                    className={`text-xs font-medium ${
                      s.attendanceRatePercent >= 75 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {s.attendanceRatePercent}% ({s.sessionsCount} sessions)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
