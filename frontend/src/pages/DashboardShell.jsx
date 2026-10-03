import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  Wallet,
  TrendingUp,
  ShieldAlert,
  CalendarClock,
  Megaphone,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Search,
  PanelLeft,
  HelpCircle,
  CreditCard,
  Building2,
  GraduationCap,
  Receipt,
  ClipboardCheck,
  Banknote,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { listStudents } from "../api/students";

function initials(name) {
  if (!name) return "FM";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DashboardShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [studentHits, setStudentHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeHit, setActiveHit] = useState(0);
  const searchInputRef = useRef(null);

  const isSystemAdmin = user?.role === "SystemAdmin";
  const isBranchAdmin = user?.role === "BranchAdmin";
  const isTeacher = user?.role === "Teacher";
  const isParent = user?.role === "Parent";
  const isStudent = user?.role === "Student";

  // Comprehensive Categorized Navigation covering all backend sub-pages
  const navSections = useMemo(() => {
    if (isTeacher) {
      return [
        {
          title: "TEACHER PORTAL",
          items: [
            { label: "Dashboard", path: "/teacher", icon: LayoutDashboard },
            { label: "Live Attendance QR", path: "/teacher/attendance-qr", icon: CalendarCheck },
            { label: "Weekly Timetable", path: "/teacher/timetable", icon: CalendarClock },
            { label: "Bank Details", path: "/teacher/bank-details", icon: Wallet },
          ],
        },
      ];
    }

    if (isParent) {
      return [
        {
          title: "PARENT PORTAL",
          items: [
            { label: "Student Dashboard", path: "/portal", icon: LayoutDashboard },
            { label: "Online Payments", path: "/portal/payments", icon: CreditCard },
          ],
        },
      ];
    }

    if (isStudent) {
      return [
        {
          title: "STUDENT PORTAL",
          items: [
            { label: "My Dashboard", path: "/student", icon: LayoutDashboard },
            { label: "Payment Portal", path: "/student/payments", icon: CreditCard },
          ],
        },
      ];
    }

    // SystemAdmin & BranchAdmin (Management Roles)
    return [
      {
        title: "OVERVIEW",
        items: [
          { label: "Dashboard", path: isBranchAdmin ? "/branch" : "/admin", icon: LayoutDashboard },
        ],
      },
      {
        title: "ACADEMICS",
        items: [
          { label: "Students", path: "/students", icon: Users },
          { label: "Teachers", path: "/teachers", icon: GraduationCap },
          { label: "Classes & Batches", path: "/classes", icon: BookOpen },
          { label: "Weekly Timetable", path: "/timetable", icon: CalendarClock },
          { label: "Attendance Reports", path: "/attendance", icon: CalendarCheck },
          { label: "AI Risk Engine", path: "/risk-students", icon: ShieldAlert, highlight: true },
        ],
      },
      {
        title: "FINANCE & BILLING",
        items: [
          { label: "Fee Management", path: "/fees", icon: Wallet },
          { label: "Counter Payments (Cash)", path: "/counter-payments", icon: Banknote },
          { label: "Class Revenue", path: "/class-revenue", icon: TrendingUp },
          ...(isSystemAdmin
            ? [
                { label: "Teacher Earnings", path: "/teacher-revenues", icon: Receipt },
                { label: "Schedule Requests", path: "/schedule-requests", icon: ClipboardCheck },
              ]
            : []),
        ],
      },
      {
        title: "COMMUNICATION",
        items: [
          { label: "Announcements", path: "/announcements", icon: Megaphone },
          { label: "Notifications", path: "/notifications", icon: Bell },
        ],
      },
      {
        title: "SYSTEM",
        items: [
          ...(isSystemAdmin ? [{ label: "Campus Branches", path: "/branches", icon: Building2 }] : []),
          ...(isSystemAdmin ? [{ label: "Settings", path: "/settings", icon: SettingsIcon }] : []),
        ],
      },
    ];
  }, [isSystemAdmin, isBranchAdmin, isTeacher, isParent, isStudent]);

  const isManagement = isSystemAdmin || isBranchAdmin;
  const trimmedQuery = searchQuery.trim();

  const pageHits = useMemo(() => {
    if (!trimmedQuery) return [];
    const term = trimmedQuery.toLowerCase();
    return navSections
      .flatMap((section) => section.items)
      .filter((item) => item.label.toLowerCase().includes(term))
      .slice(0, 5);
  }, [navSections, trimmedQuery]);

  // Live student lookup for admins — debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (!isManagement || trimmedQuery.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await listStudents({ search: trimmedQuery });
        if (!cancelled) setStudentHits(data.slice(0, 6));
      } catch {
        if (!cancelled) setStudentHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isManagement, trimmedQuery]);

  const showStudentHits = isManagement && trimmedQuery.length >= 2;
  const searchResults = useMemo(
    () => [
      ...(showStudentHits ? studentHits : []).map((s) => ({
        key: `student-${s.id}`,
        label: s.fullName,
        hint: s.studentCode,
        path: `/students/${s.id}`,
        icon: Users,
      })),
      ...pageHits.map((item) => ({ key: `page-${item.path}`, label: item.label, hint: "Page", path: item.path, icon: item.icon })),
      ...(isManagement && trimmedQuery
        ? [
            {
              key: "all-students",
              label: `All students matching "${trimmedQuery}"`,
              hint: "Students",
              path: `/students?search=${encodeURIComponent(trimmedQuery)}`,
              icon: Search,
            },
          ]
        : []),
    ],
    [showStudentHits, studentHits, pageHits, isManagement, trimmedQuery]
  );

  // Ctrl/Cmd+K focuses the header search from anywhere.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function goToResult(result) {
    if (!result) return;
    setSearchOpen(false);
    setSearchQuery("");
    searchInputRef.current?.blur();
    navigate(result.path);
  }

  function handleSearchKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveHit((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveHit((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      goToResult(searchResults[activeHit] || searchResults[0]);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  }

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const isCurrentActive = (path) => {
    if (path === "/admin" || path === "/branch" || path === "/teacher" || path === "/portal" || path === "/student") {
      return location.pathname === path;
    }
    return location.pathname === path || (path !== "/" && location.pathname.startsWith(`${path}/`));
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#F4F7F6] text-[#1A2D2A] font-sans antialiased selection:bg-[#C2E5DE] selection:text-[#062423]">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#062423]/60 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          LEFT SIDEBAR: Permanently Static / Fixed Deep Dark Spruce Green
          ========================================================================= */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-40 h-screen bg-[#062423] text-white flex flex-col justify-between transition-all duration-200 select-none w-64 shrink-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo Brand Header with Premium Enterprise Status Badge */}
          <div className="flex flex-col px-5 py-4 shrink-0 border-b border-[#0A2E2B]/80 gap-2.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#00A389] to-[#10B981] flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 6a9 9 0 1 0 0 12" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <span className="font-black text-lg text-white tracking-tight leading-none block">CSMAS</span>
                <span className="text-[10px] text-[#719891] font-semibold leading-none block mt-1 uppercase tracking-wider">
                  Tuition Institute
                </span>
              </div>
            </div>

            {/* Glowing System Status Indicator */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0E4940]/80 border border-[#145C51] text-[10px] font-extrabold text-emerald-300 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PREMIUM ENTERPRISE</span>
            </div>
          </div>

          {/* Categorized Navigation Links with smooth scroll */}
          <nav className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {section.title && (
                  <p className="px-3 pt-1 pb-1 text-[10px] font-extrabold tracking-widest text-[#5C857E] uppercase select-none">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isCurrentActive(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? "bg-gradient-to-r from-[#0E4940] to-[#0A3731] text-emerald-300 font-bold shadow-xs border-l-2 border-emerald-400"
                            : "text-[#8FAFA9] hover:text-white hover:bg-[#0A2E2B]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon size={16} className={active ? "text-emerald-300" : "text-[#759E97]"} />
                          <span>{item.label}</span>
                        </div>
                        {item.highlight && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar Utility Actions */}
        <div className="p-4 border-t border-[#0C3230] space-y-1 shrink-0">
          {isSystemAdmin && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-medium transition ${
                  isActive ? "bg-[#0E4940] text-emerald-300" : "text-[#8FAFA9] hover:text-white hover:bg-[#0A2E2B]"
                }`
              }
            >
              <SettingsIcon size={16} className="text-[#759E97]" />
              <span>Settings</span>
            </NavLink>
          )}

          <button
            type="button"
            onClick={() =>
              alert(
                `${user?.instituteName || "CSMAS"} Support\n\n• Hotline: +94 11 234 5678\n• Email: support@csmas.lk\n• Or contact your branch front desk`
              )
            }
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-medium text-[#8FAFA9] hover:text-white hover:bg-[#0A2E2B] transition cursor-pointer text-left"
          >
            <HelpCircle size={16} className="text-[#759E97]" />
            <span>Support &amp; Help</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-medium text-[#8FAFA9] hover:text-red-400 hover:bg-[#0A2E2B] transition cursor-pointer"
          >
            <LogOut size={16} className="text-[#759E97]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION AREA (Fixed Header + Scrollable Page Canvas)
          ========================================================================= */}
      <div className="flex-1 flex flex-col h-screen min-w-0 bg-[#F4F7F6] overflow-hidden">
        {/* Top Header: Permanently Fixed / Static at the top */}
        <header className="h-20 px-6 sm:px-8 flex items-center justify-between shrink-0 bg-[#F4F7F6]/95 backdrop-blur-xs border-b border-[#E3EBE8]/70 z-20 shadow-2xs">
          {/* Left: User Avatar & Bold Full Name (Floyd Miles style) */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-200"
              aria-label="Open navigation"
            >
              <PanelLeft size={20} />
            </button>

            {/* Circular Avatar Badge with photo aesthetic */}
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-[#0E4940] text-emerald-300 font-bold flex items-center justify-center text-sm shadow-xs border-2 border-white">
                {initials(user?.fullName)}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A2D2A] tracking-tight leading-tight">
                  {user?.fullName}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100/90 text-[#093C35] text-[10px] font-extrabold uppercase tracking-wider border border-emerald-300/60 shadow-2xs">
                  {user?.role?.replace(/([a-z])([A-Z])/g, "$1 $2")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#718A85] font-medium">
                <span>{user?.instituteName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-semibold">
                  {user?.branchName || (isSystemAdmin ? "All Branches" : isParent ? "Parent Portal" : "Institute")}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Search Input + Term Pill + Notification Bell + Settings Cog */}
          <div className="flex items-center gap-3">
            {/* Academic Session / Live Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-[#E3EBE8] text-xs font-semibold text-slate-600 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] text-[#1A2D2A] font-bold tracking-tight">Academic Year {new Date().getFullYear()}</span>
            </div>

            {/* Global search: students (admins) + navigation pages */}
            <div className="relative hidden sm:block">
              <div className="flex items-center justify-between gap-2 bg-white/95 border border-[#DCE6E2] rounded-2xl px-3.5 py-2 w-64 text-xs text-slate-500 shadow-2xs focus-within:border-[#00A389] focus-within:ring-2 focus-within:ring-[#00A389]/15 transition">
                <div className="flex items-center gap-2 flex-1">
                  <Search size={15} className="text-[#8DAAA5]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={searchOpen && trimmedQuery.length > 0}
                    aria-label={isManagement ? "Search students and pages" : "Search pages"}
                    placeholder={isManagement ? "Search students, pages..." : "Search pages..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveHit(0);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setSearchOpen(false)}
                    onKeyDown={handleSearchKeyDown}
                    className="bg-transparent border-none outline-none text-xs text-[#1A2D2A] placeholder-[#8DAAA5] w-full"
                  />
                </div>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200 select-none">
                  {isMac ? "⌘K" : "Ctrl K"}
                </kbd>
              </div>

              {searchOpen && trimmedQuery && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E3EBE8] rounded-2xl shadow-lg z-50 overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      {searching && showStudentHits
                        ? "Searching..."
                        : isManagement && trimmedQuery.length < 2
                          ? "Type at least 2 characters"
                          : "No matches found"}
                    </div>
                  ) : (
                    <ul className="py-1 max-h-96 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <li key={result.key}>
                          <button
                            type="button"
                            // mousedown would blur the input (closing the list) before click lands
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goToResult(result)}
                            onMouseEnter={() => setActiveHit(index)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left text-xs transition cursor-pointer ${
                              index === activeHit ? "bg-emerald-50 text-[#0E4940]" : "text-slate-700"
                            }`}
                          >
                            <result.icon size={14} className="text-[#759E97] shrink-0" />
                            <span className="flex-1 truncate font-semibold">{result.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{result.hint}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {searching && searchResults.length > 0 && (
                    <div className="px-4 py-1.5 text-[10px] text-slate-400 border-t border-slate-100">Searching students...</div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell — each role's own inbox/dashboard (only admins can open /notifications) */}
            <Link
              to={isManagement ? "/notifications" : isParent ? "/portal" : isStudent ? "/student" : "/teacher"}
              className="h-9 w-9 rounded-2xl bg-white border border-[#E3EBE8] flex items-center justify-center text-[#55736E] hover:text-[#00A389] hover:bg-emerald-50 transition shadow-2xs relative"
              aria-label="Notifications"
            >
              <Bell size={16} />
            </Link>

            {/* Settings Cog Button (System Admin only — the only role allowed on /settings) */}
            {isSystemAdmin && (
              <Link
                to="/settings"
                className="h-9 w-9 rounded-2xl bg-white border border-[#E3EBE8] flex items-center justify-center text-[#55736E] hover:text-[#00A389] hover:bg-emerald-50 transition shadow-2xs"
                aria-label="Settings"
              >
                <SettingsIcon size={16} />
              </Link>
            )}
          </div>
        </header>

        {/* Dashboard Content Canvas: Only this container scrolls down */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 pb-12 max-w-[1550px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
