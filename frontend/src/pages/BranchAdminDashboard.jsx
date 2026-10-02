import DashboardShell from "./DashboardShell";
import DashboardKpis from "./DashboardKpis";

export default function BranchAdminDashboard() {
  return (
    <DashboardShell title="Branch Operations Dashboard">
      <DashboardKpis
        scopeLabel="Branch Scope"
        dashboardTitle="Branch Operations Dashboard"
        dashboardSubtitle="Real-time attendance verification, student enrollments, and branch campus operations"
      />
    </DashboardShell>
  );
}
