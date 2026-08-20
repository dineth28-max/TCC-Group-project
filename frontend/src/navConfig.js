import {
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  BookOpen,
  CalendarCheck,
  Wallet,
  GraduationCap,
  CalendarClock,
  Megaphone,
  Bell,
  Building2,
  Settings,
  TrendingUp,
  Landmark,
  Receipt,
  CreditCard,
  ScrollText,
  ClipboardCheck,
  ShieldAlert,
} from "lucide-react";

// Each entry is either a plain link ({ label, path, icon }) or a category
// ({ label, icon, items: [...links] }) rendered as a collapsible group in the sidebar.
function managementGroups(includeSettings) {
  return [
    {
      label: "Students",
      icon: Users,
      items: [
        { label: "All Students", path: "/students", icon: Users },
        { label: "Register Student", path: "/students/new", icon: UserPlus },
        { label: "Bulk Import", path: "/students/import", icon: Upload },
      ],
    },
    {
      label: "Academics",
      icon: BookOpen,
      items: [
        { label: "Classes", path: "/classes", icon: BookOpen },
        { label: "Timetable", path: "/timetable", icon: CalendarClock },
        { label: "Schedule Requests", path: "/admin/schedule-requests", icon: ClipboardCheck },
      ],
    },
    {
      label: "Attendance & Risk",
      icon: CalendarCheck,
      items: [
        { label: "Attendance Reports", path: "/attendance", icon: CalendarCheck },
        { label: "High-Risk Students", path: "/risk-students", icon: ShieldAlert },
      ],
    },
    {
      label: "Finance",
      icon: Wallet,
      items: [
        { label: "Fees", path: "/fees", icon: Wallet },
        { label: "Teacher Revenues", path: "/teacher-revenues", icon: TrendingUp },
        { label: "Teacher Bank Details", path: "/teacher-bank-details", icon: Landmark },
        { label: "Revenue Transactions", path: "/teacher-revenue-transactions", icon: Receipt },
      ],
    },
    {
      label: "People",
      icon: GraduationCap,
      items: [
        { label: "Teachers", path: "/teachers", icon: GraduationCap },
        { label: "Branches", path: "/branches", icon: Building2 },
      ],
    },
    {
      label: "Communication",
      icon: Megaphone,
      items: [
        { label: "Announcements", path: "/announcements", icon: Megaphone },
        { label: "Notifications", path: "/notifications", icon: Bell },
      ],
    },
    {
      label: "System",
      icon: ScrollText,
      items: [
        { label: "Audit Log", path: "/audit-log", icon: ScrollText },
        ...(includeSettings ? [{ label: "Settings", path: "/settings", icon: Settings }] : []),
      ],
    },
  ];
}

const NAV_BY_ROLE = {
  SystemAdmin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
    ...managementGroups(true),
  ],
  BranchAdmin: [
    { label: "Dashboard", path: "/branch", icon: LayoutDashboard, end: true },
    ...managementGroups(false),
  ],
  Teacher: [
    { label: "Dashboard", path: "/teacher", icon: LayoutDashboard, end: true },
    { label: "Attendance QR", path: "/teacher/attendance-qr", icon: CalendarCheck },
    { label: "Weekly Timetable", path: "/teacher/timetable", icon: CalendarClock },
    { label: "Bank Details", path: "/teacher/bank-details", icon: Landmark },
  ],
  Parent: [
    { label: "Dashboard", path: "/portal", icon: LayoutDashboard, end: true },
    { label: "Payments", path: "/portal/payments", icon: CreditCard },
  ],
  Student: [
    { label: "Dashboard", path: "/student", icon: LayoutDashboard, end: true },
    { label: "Payments", path: "/student/payments", icon: CreditCard },
  ],
};

export function navItemsForRole(role) {
  return NAV_BY_ROLE[role] || [];
}
