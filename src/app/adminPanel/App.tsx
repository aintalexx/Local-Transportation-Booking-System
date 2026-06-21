import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate as useRouterNavigate } from "react-router";
import { Toaster } from "sonner";
import {
  LayoutDashboard, Users, BookOpen, Map, BarChart3,
  Settings as SettingsIcon, LogOut, ChevronRight, Menu, X,
  Car, Shield, Bell, CheckCircle, AlertTriangle, Info, XCircle,
  Archive, MonitorX,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { NavigationContext, type MapDriverTarget, type PageKey } from "./context/NavigationContext";
import { AppStateProvider, useAppState } from "./context/AppStateContext";
import { Overview }  from "./pages/Overview";
import { Drivers }   from "./pages/Drivers";
import { Bookings }  from "./pages/Bookings";
import { LiveMap }   from "./pages/LiveMap";
import { Analytics } from "./pages/Analytics";
import { Settings }  from "./pages/Settings";
import { Archives }  from "./pages/Archives";

const MAROON        = "#3E0710";
const MAROON_ACCENT = "#6B0E1A";
const GOLD          = "#C49A1A";

const PAGE_PATHS: Record<PageKey, string> = {
  overview: "/admin",
  drivers:  "/admin/drivers",
  bookings: "/admin/bookings",
  map:      "/admin/live-map",
  analytics:"/admin/analytics",
  settings: "/admin/settings",
  archives: "/admin/archives",
};

function getPageFromPath(pathname: string): PageKey {
  if (pathname.startsWith("/admin/drivers"))  return "drivers";
  if (pathname.startsWith("/admin/bookings")) return "bookings";
  if (pathname.startsWith("/admin/live-map")) return "map";
  if (pathname.startsWith("/admin/analytics"))return "analytics";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/archives")) return "archives";
  return "overview";
}

const PAGE_TITLES: Record<PageKey, string> = {
  overview:  "Dashboard Overview",
  drivers:   "Driver Management",
  bookings:  "Booking Monitoring",
  map:       "Live Map Monitoring",
  analytics: "Analytics & Reports",
  settings:  "Settings",
  archives:  "Archives",
};

const NOTIF_ICON: Record<string, any> = {
  success: CheckCircle,
  warning: AlertTriangle,
  info:    Info,
  error:   XCircle,
};
const NOTIF_COLOR: Record<string, string> = {
  success: "text-green-600",
  warning: "text-amber-600",
  info:    "text-blue-600",
  error:   "text-red-500",
};

// ─── Inner shell (reads from both contexts) ───────────────────────────────────
function AppShell({ onLogout, onSignOutAllDevices }: { onLogout: () => void; onSignOutAllDevices: () => void }) {
  const location = useLocation();
  const routerNavigate = useRouterNavigate();
  const {
    notifications, pendingDriverCount, unreadCount,
    archivedDrivers,
    markRead, markAllRead,
  } = useAppState();
  const archivedCount = archivedDrivers.length;

  const [page,         setPage]         = useState<PageKey>(() => getPageFromPath(location.pathname));
  const [transitioning,setTransitioning]= useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [bellPulse,    setBellPulse]    = useState(false);
  const [mapDriverTarget, setMapDriverTarget] = useState<MapDriverTarget | null>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(unreadCount);

  // Flash bell when a new unread notification arrives
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setBellPulse(true);
      const t = setTimeout(() => setBellPulse(false), 1400);
      return () => clearTimeout(t);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  function navigate(target: PageKey, options?: { mapDriverTarget?: MapDriverTarget | null }) {
    if (Object.prototype.hasOwnProperty.call(options || {}, "mapDriverTarget")) {
      setMapDriverTarget(options?.mapDriverTarget || null);
    } else {
      setMapDriverTarget(null);
    }

    if (target === page) return;
    setTransitioning(true);
    routerNavigate(PAGE_PATHS[target]);
    setTimeout(() => { setPage(target); setTransitioning(false); }, 120);
  }

  useEffect(() => {
    const nextPage = getPageFromPath(location.pathname);
    if (nextPage !== page) {
      setPage(nextPage);
    }
  }, [location.pathname, page]);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const navItems: { key: PageKey; label: string; icon: any }[] = [
    { key: "overview",  label: "Overview",  icon: LayoutDashboard },
    { key: "drivers",   label: "Drivers",   icon: Users },
    { key: "bookings",  label: "Bookings",  icon: BookOpen },
    { key: "map",       label: "Live Map",  icon: Map },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "archives",  label: "Archives",  icon: Archive },
  ];

  const pageMap: Record<PageKey, () => React.ReactNode> = {
    overview:  () => <Overview  />,
    drivers:   () => <Drivers   />,
    bookings:  () => <Bookings  />,
    map:       () => <LiveMap   />,
    analytics: () => <Analytics />,
    settings:  () => <Settings  />,
    archives:  () => <Archives  />,
  };

  return (
    <NavigationContext.Provider value={{ page, navigate, mapDriverTarget, clearMapDriverTarget: () => setMapDriverTarget(null) }}>
      <div className="admin-figma-theme flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* MARKER-MAKE-KIT-INVOKED */}
        <Toaster position="top-right" richColors closeButton />

        {/* ── Sidebar ── */}
        <aside
          className="flex flex-col h-screen border-r border-sidebar-border transition-[width] duration-300 ease-in-out shrink-0 z-20"
          style={{ width: sidebarOpen ? 224 : 64, background: MAROON }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 hover:scale-110 transition-transform" style={{ background: GOLD }}>
              <Car size={16} className="text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p style={{ fontFamily: "'Noto Serif Display', serif", color: "#FAF5EE", fontWeight: 700, fontSize: "15px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  Arangkada
                </p>
                <p style={{ color: GOLD, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}>
                  TRANSPORT ADMIN
                </p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="ml-auto text-white/40 hover:text-white/90 transition-colors shrink-0 p-1 rounded-lg hover:bg-white/8"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
            {sidebarOpen && (
              <p className="px-3 pb-2 uppercase" style={{ color: "rgba(255,255,255,0.28)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}>
                Navigation
              </p>
            )}
            {navItems.map(({ key, label, icon: Icon }) => {
              const active = page === key;
              // Live badge: pending count on Drivers, archived count on Archives
              const liveBadge =
                key === "drivers"  ? pendingDriverCount :
                key === "archives" ? archivedCount :
                0;
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  title={!sidebarOpen ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${
                    active ? "text-white" : "text-white/50 hover:text-white/90 hover:bg-white/8"
                  }`}
                  style={active ? { background: "rgba(255,255,255,0.14)" } : {}}
                >
                  <div className="relative shrink-0">
                    <Icon size={15} />
                    {liveBadge > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-white font-bold rounded-full transition-all duration-300"
                        style={{ background: GOLD, width: 15, height: 15, fontSize: 8 }}
                      >
                        {liveBadge}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left" style={{ fontSize: "13.5px", fontWeight: 600 }}>{label}</span>
                      {active && <ChevronRight size={11} className="opacity-50" />}
                    </>
                  )}
                  {active && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 rounded-l-full" style={{ background: GOLD, height: 24 }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-2 pb-4 border-t border-sidebar-border pt-3 space-y-0.5">
            <button
              onClick={() => navigate("settings")}
              title={!sidebarOpen ? "Settings" : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${
                page === "settings" ? "text-white" : "text-white/50 hover:text-white/90 hover:bg-white/8"
              }`}
              style={page === "settings" ? { background: "rgba(255,255,255,0.14)" } : {}}
            >
              <SettingsIcon size={15} className="shrink-0" />
              {sidebarOpen && <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Settings</span>}
              {page === "settings" && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 rounded-l-full" style={{ background: GOLD, height: 24 }} />
              )}
            </button>

            <button
              onClick={onLogout}
              title={!sidebarOpen ? "Sign out" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white/90 hover:bg-white/8 transition-all duration-150"
            >
              <LogOut size={15} className="shrink-0" />
              {sidebarOpen && <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Sign out</span>}
            </button>

            <button
              onClick={onSignOutAllDevices}
              title={!sidebarOpen ? "Sign out all devices" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white/90 hover:bg-white/8 transition-all duration-150"
            >
              <MonitorX size={15} className="shrink-0" />
              {sidebarOpen && <span style={{ fontSize: "13.5px", fontWeight: 600 }}>Sign out all devices</span>}
            </button>

            {/* User chip */}
            <div
              className={`mt-2 rounded-xl p-2.5 flex items-center gap-2.5 ${!sidebarOpen ? "justify-center" : ""}`}
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-xs text-white" style={{ background: GOLD }}>
                AD
              </div>
              {sidebarOpen && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: "12px", fontWeight: 700, color: "#FAF5EE" }}>Admin User</p>
                    <p className="truncate" style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)" }}>admin@arangkada.ph</p>
                  </div>
                  <Shield size={12} style={{ color: GOLD }} className="shrink-0" />
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between px-6 h-14 bg-card border-b border-border shrink-0 shadow-sm z-10">
            <div>
              <h2 className="text-foreground" style={{ fontWeight: 700, fontSize: "14px" }}>{PAGE_TITLES[page]}</h2>
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Arangkada Transportation System · Sta. Mesa, Manila
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground" style={{ fontSize: "11.5px", fontWeight: 600 }}>
                  Live · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className={`relative w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                    notifOpen
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  } ${bellPulse ? "scale-110" : ""}`}
                  title="Notifications"
                >
                  <Bell size={14} className={bellPulse ? "animate-bounce" : ""} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold rounded-full border-2 border-card transition-all duration-300"
                      style={{ background: GOLD, width: 16, height: 16, fontSize: 9 }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-84 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden" style={{ width: 320 }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground" style={{ fontWeight: 700, fontSize: "13px" }}>Notifications</p>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center text-white text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: GOLD }}>
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="hover:underline"
                          style={{ fontSize: "11px", color: MAROON_ACCENT, fontWeight: 700 }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-xs text-muted-foreground">No notifications</div>
                      ) : (
                        notifications.map((n) => {
                          const NIcon = NOTIF_ICON[n.type];
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                markRead(n.id);
                                if (n.type === "warning" && n.title.includes("Payment")) navigate("settings");
                                else if (n.title.includes("Driver") || n.title.includes("Application")) navigate("drivers");
                                else if (n.title.includes("Booking")) navigate("bookings");
                                setNotifOpen(false);
                              }}
                              className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/50 ${!n.read ? "bg-amber-50/40" : ""}`}
                            >
                              <NIcon size={14} className={`${NOTIF_COLOR[n.type]} mt-0.5 shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-foreground truncate ${!n.read ? "font-bold" : ""}`} style={{ fontSize: "12.5px", fontWeight: n.read ? 500 : 700 }}>
                                  {n.title}
                                </p>
                                <p className="text-muted-foreground mt-0.5 leading-relaxed line-clamp-2" style={{ fontSize: "11.5px" }}>
                                  {n.body}
                                </p>
                                <p className="text-muted-foreground mt-1" style={{ fontSize: "10.5px", fontWeight: 600 }}>
                                  {n.time}
                                </p>
                              </div>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: GOLD }} />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                      <button
                        onClick={() => { navigate("settings"); setNotifOpen(false); }}
                        className="hover:underline"
                        style={{ fontSize: "11.5px", fontWeight: 700, color: MAROON_ACCENT }}
                      >
                        Notification settings →
                      </button>
                      <span className="text-xs text-muted-foreground">{notifications.length} total</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <button
                onClick={() => navigate("settings")}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white hover:ring-2 hover:ring-offset-2 hover:ring-primary active:scale-95 transition-all"
                style={{ background: MAROON }}
                title="Account settings"
              >
                AD
              </button>
            </div>
          </header>

          {/* Page with fade transition */}
          <main
            className="flex-1 overflow-y-auto px-6 py-5 transition-opacity duration-150"
            style={{ opacity: transitioning ? 0 : 1 }}
          >
            {pageMap[page]()}
          </main>
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function App() {
  const routerNavigate = useRouterNavigate();
  const { user, logout, signOutAllDevices } = useUser();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      routerNavigate("/login", { replace: true });
    }
  }, [user, routerNavigate]);

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <AppStateProvider>
      <AppShell
        onLogout={() => {
          logout();
          routerNavigate("/login");
        }}
        onSignOutAllDevices={() => {
          if (confirm("Sign out this admin account on all devices?")) {
            signOutAllDevices();
            routerNavigate("/login");
          }
        }}
      />
    </AppStateProvider>
  );
}
