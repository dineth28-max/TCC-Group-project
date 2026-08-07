import DashboardShell from "./DashboardShell";
import DashboardKpis from "./DashboardKpis";

export default function AdminDashboard() {
  return (
    <DashboardShell title="System Admin Dashboard">
      <DashboardKpis scopeLabel="institute-wide" />
    </DashboardShell>
  );
}
