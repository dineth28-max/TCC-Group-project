import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { listMyClasses, listSessions, getClassPerformance } from "../api/attendance";

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
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-violet-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Today's Sessions</h2>
            <Link to="/teacher/attendance-qr" className="text-xs text-violet-700 hover:underline">
              Open a new session
            </Link>
          </div>
          {todaySessions.length === 0 ? (
            <p className="text-slate-500 text-sm">No sessions opened today yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {todaySessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span>{s.subject}</span>
                  <span className={`text-xs ${s.status === "Open" ? "text-emerald-600" : "text-slate-500"}`}>{s.status}</span>
                  <Link to={`/teacher/attendance-qr?sessionId=${s.id}`} className="text-xs text-violet-700 hover:underline">
                    View
                  </Link>
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
