import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import DashboardShell from "./DashboardShell";
import { checkIn } from "../api/attendance";
import { getMyProfile, getMyTimetable, getMyFees, getMyParents, addMyParent } from "../api/me";

const SCANNER_ELEMENT_ID = "qr-checkin-reader";
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentView() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [fees, setFees] = useState(null);
  const [parents, setParents] = useState([]);
  const [parentForm, setParentForm] = useState({ parentName: "", parentEmail: "", password: "" });
  const [parentMessage, setParentMessage] = useState(null);
  const [parentError, setParentError] = useState(null);
  const scannerRef = useRef(null);

  function loadParents() {
    getMyParents().then(setParents).catch(() => setParents([]));
  }

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => setProfile(null));
    getMyTimetable().then(setTimetable).catch(() => setTimetable([]));
    getMyFees().then(setFees).catch(() => setFees(null));
    loadParents();
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function handleAddParent(e) {
    e.preventDefault();
    setParentError(null);
    setParentMessage(null);
    try {
      await addMyParent(parentForm);
      setParentForm({ parentName: "", parentEmail: "", password: "" });
      setParentMessage("Parent account created. They can log in now and will only see your attendance, fees, and progress.");
      loadParents();
    } catch (err) {
      setParentError(err.response?.data?.message || "Could not add this parent.");
    }
  }

  async function startScan() {
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await handleScanned(decodedText);
        },
        () => {} // ignore per-frame decode failures
      );
    } catch {
      setScanning(false);
      setError("Could not access the camera. Check browser permissions.");
    }
  }

  function handleScanned(qrToken) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("Location services are required to check in.");
        resolve();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await checkIn({
              qrToken,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setResult(response);
          } catch (err) {
            setError(err.response?.data?.message || "Check-in failed.");
          }
          resolve();
        },
        () => {
          setError("Could not read your location. Enable location services and try again.");
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  const sortedTimetable = [...timetable].sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime)
  );

  return (
    <DashboardShell title="Student View">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Attendance Check-In</h2>

          {!scanning && (
            <button onClick={startScan} className="bg-violet-700 text-white rounded px-4 py-2 text-sm">
              Scan Session QR
            </button>
          )}

          <div id={SCANNER_ELEMENT_ID} className={scanning ? "mt-4 w-full" : "hidden"} />

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

          {result && (
            <p
              className={`text-sm mt-3 font-medium ${
                result.status === "OutOfRange" ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {result.status === "OutOfRange"
                ? `Too far from your branch (${Math.round(result.distanceMeters)}m away).`
                : `Checked in: ${result.status}`}
            </p>
          )}

          <div className="border-t border-slate-100 mt-5 pt-4 text-center">
            <h3 className="font-medium text-slate-700 text-sm mb-2">My Identity QR Code</h3>
            {profile ? (
              <>
                <button onClick={() => setShowQr((v) => !v)} className="text-xs text-violet-700 hover:underline mb-3">
                  {showQr ? "Hide" : "Show"} QR Code
                </button>
                {showQr && (
                  <div className="flex flex-col items-center gap-2">
                    <QRCodeSVG value={profile.qrPayload} size={160} />
                    <p className="text-xs font-mono text-slate-500">{profile.studentCode}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">Loading…</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">My Timetable</h2>
          {sortedTimetable.length === 0 ? (
            <p className="text-slate-500 text-sm">No timetable slots published yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {sortedTimetable.map((t) => (
                <li key={t.id} className="border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">{t.subject}</span>
                    <span className="text-xs text-slate-500">{t.dayOfWeek}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.startTime}–{t.endTime} {t.room ? `· ${t.room}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">My Fee Summary</h2>
          {fees ? (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Outstanding</span>
                <span className="font-semibold text-red-600">{fees.totalDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-slate-500">Paid to date</span>
                <span className="font-semibold text-emerald-700">{fees.totalPaid.toFixed(2)}</span>
              </div>
              <ul className="text-xs space-y-1.5">
                {fees.invoices.map((inv) => (
                  <li key={inv.id} className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span>{inv.subject} · {inv.billingPeriod}</span>
                    <span
                      className={
                        inv.status === "Paid" ? "text-emerald-700" : inv.status === "Overdue" ? "text-red-600" : "text-amber-700"
                      }
                    >
                      {inv.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-slate-500 text-sm">No invoices yet.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">My Parents</h2>
          {parents.length === 0 ? (
            <p className="text-slate-500 text-sm mb-3">No parent account linked yet.</p>
          ) : (
            <ul className="text-sm space-y-1.5 mb-3">
              {parents.map((p) => (
                <li key={p.id} className="border-t border-slate-100 pt-1.5">
                  <div className="font-medium text-slate-700">{p.parentName}</div>
                  <div className="text-xs text-slate-500">{p.parentEmail}</div>
                </li>
              ))}
            </ul>
          )}

          {parentMessage && <p className="text-emerald-700 text-xs mb-2">{parentMessage}</p>}
          {parentError && <p className="text-red-600 text-xs mb-2">{parentError}</p>}

          <form onSubmit={handleAddParent} className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">Add a parent — they'll be able to see only your attendance, fees, and progress.</p>
            <input
              placeholder="Parent name"
              required
              value={parentForm.parentName}
              onChange={(e) => setParentForm({ ...parentForm, parentName: e.target.value })}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
            <input
              type="email"
              placeholder="Parent email"
              required
              value={parentForm.parentEmail}
              onChange={(e) => setParentForm({ ...parentForm, parentEmail: e.target.value })}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              required
              minLength={8}
              value={parentForm.password}
              onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
            <button type="submit" className="bg-violet-700 text-white rounded px-4 py-1.5 text-sm w-full">
              Add Parent
            </button>
          </form>
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-4">
        Read-only — no payment actions here, and no risk score, bucket, or reasons are ever shown on this view.
      </p>
    </DashboardShell>
  );
}
