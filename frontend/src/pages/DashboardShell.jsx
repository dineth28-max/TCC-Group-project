import { useEffect, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { Menu, Bell, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { navItemsForRole } from "../navConfig";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isGroupActive(group, pathname) {
  return group.items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

export default function DashboardShell({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const navItems = navItemsForRole(user?.role);

  // Whichever category the current page belongs to stays open automatically — someone landing on
  // "Register Student" via a direct link should immediately see it nested under "Students", not
  // have to go hunting for the right category first.
  useEffect(() => {
    const activeGroup = navItems.find((entry) => entry.items && isGroupActive(entry, location.pathname));
    if (activeGroup) {
      setExpandedGroups((prev) => (prev.has(activeGroup.label) ? prev : new Set(prev).add(activeGroup.label)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function toggleGroup(label) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function toggleSidebar() {
    // One button serves both layouts: on mobile it opens/closes the off-canvas drawer; on
    // desktop (where the drawer classes have no visual effect) it toggles icon-only collapse.
    setCollapsed((v) => !v);
    setMobileOpen((v) => !v);
  }

  return (
    <div className="h-screen flex bg-violet-50 overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 h-full bg-[#1e1333] text-violet-200 flex flex-col transition-all duration-200 w-64 ${
          collapsed ? "md:w-[72px]" : "md:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            CS
          </div>
          {!collapsed && <span className="font-semibold text-white whitespace-nowrap md:inline">CSMAS</span>}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((entry) =>
            entry.items ? (
              <div key={entry.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  title={collapsed ? entry.label : undefined}
                  aria-expanded={expandedGroups.has(entry.label)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-white/10 hover:text-white ${
                    isGroupActive(entry, location.pathname) ? "text-white" : "text-violet-200"
                  }`}
                >
                  <entry.icon size={18} className="shrink-0" />
                  {/* Always show the label on mobile (drawer is full-width there regardless of
                      "collapsed", which only affects the desktop icon-only rail). */}
                  <span className={`flex-1 text-left truncate ${collapsed ? "md:hidden" : ""}`}>{entry.label}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${expandedGroups.has(entry.label) ? "rotate-180" : ""} ${
                      collapsed ? "md:hidden" : ""
                    }`}
                  />
                </button>

                {/* Animated to an intrinsic height via the 0fr/1fr grid-row trick (rather than a
                    fixed max-height guess) so a category with more items doesn't get clipped —
                    the child stays in the DOM either way, just collapsed to zero height, which is
                    what makes the height transition animatable at all. */}
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={{ gridTemplateRows: expandedGroups.has(entry.label) ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1 pb-0.5">
                      {entry.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.end}
                          title={collapsed ? item.label : undefined}
                          tabIndex={expandedGroups.has(entry.label) ? undefined : -1}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                              isActive ? "bg-violet-600 text-white shadow-sm" : "text-violet-300 hover:bg-white/10 hover:text-white"
                            }`
                          }
                        >
                          <item.icon size={16} className="shrink-0" />
                          <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <NavLink
                key={entry.path}
                to={entry.path}
                end={entry.end}
                title={collapsed ? entry.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-violet-600 text-white shadow-sm" : "text-violet-200 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <entry.icon size={18} className="shrink-0" />
                <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{entry.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-gradient-to-r from-violet-600 to-purple-500 flex items-center justify-between px-4 shadow-sm shrink-0">
          <div className="flex items-center gap-3 text-white min-w-0">
            <button
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              className="p-2 rounded-md hover:bg-white/15 transition"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button aria-label="Notifications" className="p-2 rounded-full hover:bg-white/15 text-white transition relative">
              <Bell size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/15 transition text-white"
              >
                <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                  {initials(user?.fullName)}
                </span>
                <span className="hidden sm:block text-sm font-medium">{user?.fullName}</span>
                <ChevronDown size={16} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-violet-100 py-2 z-20 text-slate-700">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {user?.role}
                      {user?.instituteName ? ` · ${user.instituteName}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
