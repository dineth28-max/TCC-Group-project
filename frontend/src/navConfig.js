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
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

const NAV_BY_ROLE = {
  SystemAdmin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
    ...MANAGEMENT_NAV,
    { label: "Settings", path: "/settings", icon: Settings },
  ],
  BranchAdmin: [{ label: "Dashboard", path: "/branch", icon: LayoutDashboard, end: true }, ...MANAGEMENT_NAV],
  Teacher: [{ label: "Dashboard", path: "/teacher", icon: LayoutDashboard, end: true }],
  Parent: [{ label: "Dashboard", path: "/portal", icon: LayoutDashboard, end: true }],
  Student: [{ label: "Dashboard", path: "/student", icon: LayoutDashboard, end: true }],
};

export function navItemsForRole(role) {
  return NAV_BY_ROLE[role] || [];
}
