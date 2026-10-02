import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listMyClasses, listSessions, getClassPerformance } from "../api/attendance";
import { QrCode, Calendar, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";

const TODAY = new Date().toISOString().slice(0, 10);

export default function TeacherDashboard() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [todaySessions, setTodaySessions] = useState([]);
  const [performance, setPerformance] = useState(null);

  useEffect(() => {
    listMyClasses().then((data) => {
      setClasses(data);
      if (data.length > 0) setSelectedClassId(String(data[0].id));
    });
    listSessions().then((all) => setTodaySessions(all.filter((s) => s.sessionDate === TODAY)));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    getClassPerformance(selectedClassId).then(setPerformance);
  }, [selectedClassId]);

  return (
    <DashboardShell title="Teacher Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Dashboard</h1>
        <p className="text-xs text-slate-500 mt-1">Class sessions management, QR attendance verification, and student engagement</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Sessions Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#2457FF]" />
              <h2 className="text-sm font-bold text-slate-900">Today's Class Sessions</h2>
            </div>
            <Link
              to="/teacher/attendance-qr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2457FF] text-white hover:bg-[#1b45db] transition shadow-2xs"
            >
              <QrCode size={13} />
              <span>Launch QR Session</span>
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No attendance sessions opened today yet. Launch a session to project the QR check-in code.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {todaySessions.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{s.subject}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{s.sessionDate}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "Open"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.status}
                    </span>
                    <Link
                      to={`/teacher/attendance-qr?sessionId=${s.id}`}
                      className="text-xs font-semibold text-[#2457FF] hover:underline"
                    >
                      Open Live QR →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Class Performance Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#2457FF]" />
              <h2 className="text-sm font-bold text-slate-900">
                Class Attendance Rates
              </h2>
            </div>
            {classes.length > 0 && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!performance || performance.students.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No recent attendance records found for this course.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <ul className="divide-y divide-slate-100 text-xs">
                {performance.students.map((s) => (
                  <li key={s.studentId} className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{s.fullName}</span>
                    <span
                      className={`font-semibold font-mono ${
                        s.attendanceRatePercent >= 75 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {s.attendanceRatePercent}% ({s.sessionsCount} sessions)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
