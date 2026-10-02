import DashboardShell from "./DashboardShell";
import DashboardKpis from "./DashboardKpis";

export default function AdminDashboard() {
  return (
    <DashboardShell title="System Admin Dashboard">
      <DashboardKpis
        scopeLabel="institute-wide"
        dashboardTitle="Institute Executive Dashboard"
        dashboardSubtitle="Comprehensive student enrollment, attendance monitoring, revenue performance, and AI risk detection"
      />
    </DashboardShell>
  );
}
