import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import DashboardKpis from "./DashboardKpis";

export default function BranchAdminDashboard() {
  return (
    <DashboardShell title="Branch Admin Dashboard">
      <DashboardKpis scopeLabel="your branch" />

      <p className="text-slate-600 text-sm mt-6">
        <Link to="/students/new" className="text-violet-700 underline">
          Register a student
        </Link>{" "}
        or use the sidebar to manage classes, teachers, timetable, fees, and announcements.
      </p>
    </DashboardShell>
  );
}
