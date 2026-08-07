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
} from "lucide-react";

const MANAGEMENT_NAV = [
  { label: "Students", path: "/students", icon: Users },
  { label: "Register Student", path: "/students/new", icon: UserPlus },
  { label: "Bulk Import", path: "/students/import", icon: Upload },
  { label: "Classes", path: "/classes", icon: BookOpen },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck },
  { label: "Fees", path: "/fees", icon: Wallet },
  { label: "Teachers", path: "/teachers", icon: GraduationCap },
  { label: "Branches", path: "/branches", icon: Building2 },
  { label: "Timetable", path: "/timetable", icon: CalendarClock },
  { label: "Schedule Requests", path: "/admin/schedule-requests", icon: ClipboardCheck },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Teacher Revenues", path: "/teacher-revenues", icon: TrendingUp },
  { label: "Teacher Bank Details", path: "/teacher-bank-details", icon: Landmark },
  { label: "Revenue Transactions", path: "/teacher-revenue-transactions", icon: Receipt },
  { label: "Audit Log", path: "/audit-log", icon: ScrollText },
];

const NAV_BY_ROLE = {
  SystemAdmin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
    ...MANAGEMENT_NAV,
    { label: "Settings", path: "/settings", icon: Settings },
  ],
  BranchAdmin: [{ label: "Dashboard", path: "/branch", icon: LayoutDashboard, end: true }, ...MANAGEMENT_NAV],
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
