import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import DashboardShell from "./DashboardShell";
import {
  listMyClasses,
  listSessions,
  createSession,
  getSession,
  regenerateQr,
  getLiveAttendance,
  overrideAttendance,
  closeSession,
} from "../api/attendance";

const LIVE_POLL_MS = 5000;
const QR_DURATIONS = [5, 10, 15, 30, 60];

export default function TeacherAttendanceQr() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [qrDurationMinutes, setQrDurationMinutes] = useState(10);
  const [activeSession, setActiveSession] = useState(null);
  const [live, setLive] = useState(null);
  const [error, setError] = useState(null);
  const [overrideReason, setOverrideReason] = useState({});
  const [minutesLeft, setMinutesLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);
  const qrTickRef = useRef(null);

  useEffect(() => {
    listMyClasses().then((data) => {
      setClasses(data);
      if (data.length > 0) setSelectedClassId(String(data[0].id));
    });

    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      getSession(sessionId).then(setActiveSession).catch(() => {});
    }
  }, [searchParams]);

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
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await createSession({
        classId: Number(selectedClassId),
        graceMinutes: 10,
        qrDurationMinutes,
      });
      setActiveSession(session);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateQr() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await regenerateQr(activeSession.id, qrDurationMinutes);
      setActiveSession(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Could not regenerate QR.");
    } finally {
      setBusy(false);
    }
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
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await closeSession(activeSession.id);
      const refreshed = await getLiveAttendance(activeSession.id);
      setLive(refreshed);
      setActiveSession((prev) => ({ ...prev, status: "Closed" }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not close session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell title="Attendance QR">
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Start a Session</h2>
          {classes.length === 0 ? (
            <p className="text-slate-500 text-sm">No classes assigned to you yet.</p>
          ) : (
            <>
              <label htmlFor="qr-class" className="block text-xs text-slate-500 mb-1">Class</label>
              <select
                id="qr-class"
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
              <label htmlFor="qr-duration" className="block text-xs text-slate-500 mb-1">QR duration</label>
              <select
                id="qr-duration"
                value={qrDurationMinutes}
                onChange={(e) => setQrDurationMinutes(Number(e.target.value))}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
              >
                {QR_DURATIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateSession}
                disabled={busy}
                className="bg-violet-700 text-white rounded px-4 py-2 text-sm w-full disabled:opacity-50"
              >
                Generate QR &amp; Open Session
              </button>
            </>
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
                  <label htmlFor="qr-regen-duration" className="block text-xs text-slate-500 mt-3 mb-1">
                    Regenerate with duration
                  </label>
                  <select
                    id="qr-regen-duration"
                    value={qrDurationMinutes}
                    onChange={(e) => setQrDurationMinutes(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs mb-2"
                  >
                    {QR_DURATIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-1">
                    <button onClick={handleRegenerateQr} disabled={busy} className="text-xs text-violet-700 hover:underline disabled:opacity-50">
                      Regenerate QR
                    </button>
                    <button onClick={handleClose} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">
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
    </DashboardShell>
  );
}
