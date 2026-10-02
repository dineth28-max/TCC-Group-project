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
  FileSpreadsheet,
  Banknote,
} from "lucide-react";

// Structure matches the enterprise dashboard navigation from Image 1:
// Grouped by uppercase section headers: PEOPLE, FINANCE, ACADEMICS, COMMUNICATION, SYSTEM
function managementSections(includeSettings) {
  return [
    {
      section: null, // Top-level quick links
      items: [
        { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true, category: "Overview" },
      ],
    },
    {
      section: "PEOPLE",
      items: [
        { label: "Teachers", path: "/teachers", icon: GraduationCap, category: "People" },
        {
          label: "Students",
          icon: Users,
          category: "People",
          path: "/students",
          items: [
            { label: "All Students", path: "/students", icon: Users, end: true, category: "People" },
            { label: "Register Student", path: "/students/new", icon: UserPlus, category: "People" },
            { label: "Bulk Import", path: "/students/import", icon: Upload, category: "People" },
          ],
        },
        { label: "Staff & Branches", path: "/branches", icon: Building2, category: "People" },
        { label: "High-Risk Students", path: "/risk-students", icon: ShieldAlert, category: "People" },
      ],
    },
    {
      section: "FINANCE",
      items: [
        { label: "Fee Management", path: "/fees", icon: Wallet, category: "Finance" },
        { label: "Counter Payments (Cash)", path: "/counter-payments", icon: Banknote, category: "Finance" },
        {
          label: "Reports",
          icon: TrendingUp,
          category: "Finance",
          items: [
            { label: "Class Revenue", path: "/class-revenue", icon: Landmark, category: "Finance" },
            { label: "Finance History", path: "/teacher-revenue-transactions", icon: Receipt, category: "Finance" },
          ],
        },
        {
          label: "Payments",
          icon: CreditCard,
          category: "Finance",
          items: [
            { label: "Teacher Bank Details", path: "/teacher-bank-details", icon: Landmark, category: "Finance" },
            { label: "Revenue Transactions", path: "/teacher-revenue-transactions", icon: Receipt, category: "Finance" },
          ],
        },
      ],
    },
    {
      section: "ACADEMICS",
      items: [
        { label: "Classes", path: "/classes", icon: BookOpen, category: "Academics" },
        { label: "Timetable", path: "/timetable", icon: CalendarClock, category: "Academics" },
        { label: "Schedule Requests", path: "/admin/schedule-requests", icon: ClipboardCheck, category: "Academics" },
        { label: "Attendance Reports", path: "/attendance", icon: CalendarCheck, category: "Academics" },
      ],
    },
    {
      section: "COMMUNICATION",
      items: [
        { label: "Announcements", path: "/announcements", icon: Megaphone, category: "Communication" },
        { label: "Notifications", path: "/notifications", icon: Bell, category: "Communication" },
      ],
    },
    {
      section: "SYSTEM",
      items: [
        ...(includeSettings
          ? [{ label: "Settings", path: "/settings", icon: Settings, category: "System" }]
          : []),
      ],
    },
  ];
}

function branchAdminSections() {
  const sections = managementSections(false);
  sections[0].items = [
    { label: "Dashboard", path: "/branch", icon: LayoutDashboard, end: true, category: "Overview" },
  ];
  return sections;
}

const NAV_SECTIONS_BY_ROLE = {
  SystemAdmin: managementSections(true),
  BranchAdmin: branchAdminSections(),
  Teacher: [
    {
      section: null,
      items: [
        { label: "Dashboard", path: "/teacher", icon: LayoutDashboard, end: true, category: "Overview" },
      ],
    },
    {
      section: "ACADEMICS",
      items: [
        { label: "Attendance QR", path: "/teacher/attendance-qr", icon: CalendarCheck, category: "Academics" },
        { label: "Weekly Timetable", path: "/teacher/timetable", icon: CalendarClock, category: "Academics" },
      ],
    },
    {
      section: "FINANCE",
      items: [
        { label: "Bank Details", path: "/teacher/bank-details", icon: Landmark, category: "Finance" },
      ],
    },
  ],
  Parent: [
    {
      section: null,
      items: [
        { label: "Dashboard", path: "/portal", icon: LayoutDashboard, end: true, category: "Overview" },
      ],
    },
    {
      section: "FINANCE",
      items: [
        { label: "Payments", path: "/portal/payments", icon: CreditCard, category: "Finance" },
      ],
    },
  ],
  Student: [
    {
      section: null,
      items: [
        { label: "Dashboard", path: "/student", icon: LayoutDashboard, end: true, category: "Overview" },
      ],
    },
    {
      section: "FINANCE",
      items: [
        { label: "Payments", path: "/student/payments", icon: CreditCard, category: "Finance" },
      ],
    },
  ],
};

export function navSectionsForRole(role) {
  return NAV_SECTIONS_BY_ROLE[role] || [];
}

// Flat list helper for search palette and breadcrumb resolution
export function allNavItemsForRole(role) {
  const sections = navSectionsForRole(role);
  const items = [];
  sections.forEach((s) => {
    s.items.forEach((item) => {
      if (item.items) {
        items.push(item);
        item.items.forEach((sub) => items.push(sub));
      } else {
        items.push(item);
      }
    });
  });
  return items;
}
