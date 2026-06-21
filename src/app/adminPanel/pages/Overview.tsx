import { useEffect, useMemo, useState } from "react";
import {
  Car, Users, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, RefreshCw, AlertTriangle,
  Download, Search,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { useNavigate } from "../context/NavigationContext";
import { toast } from "sonner";
import { StatusBadge, type StatusKey } from "../components/ui/StatusBadge";
import { BTN_OUTLINE_SM, BTN_GHOST_LINK, CARD, CARD_HEADER, SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE } from "../lib/ui";
import { exportBookingsCsv, exportDriversCsv, exportPassengersCsv, exportRatingsCsv } from "../../utils/adminCsvExports";
import { fetchDashboardSnapshot, subscribeToDashboardChanges, type DashboardSnapshot } from "../utils/dashboardData";

const MAROON = "#6B0E1A";
const GOLD = "#C49A1A";

const systemStatus = [
  { label: "Booking API", ok: true, action: null },
  { label: "GPS Tracking", ok: true, action: "map" as const },
  { label: "Payment Gateway", ok: false, action: "settings" as const },
  { label: "SMS Notifications", ok: true, action: "settings" as const },
  { label: "Driver App Server", ok: true, action: null },
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs font-bold text-foreground">{payload[0].value} rides</p>
    </div>
  );
}

function buildHourlyData(bookings: DashboardSnapshot["bookings"]) {
  return Array.from({ length: 15 }, (_, index) => {
    const hour = 6 + index;
    return {
      time: `${hour}${hour < 12 ? "AM" : "PM"}`,
      rides: bookings.filter((booking) => {
        const created = booking.created_at ? new Date(booking.created_at) : null;
        return created ? created.getHours() === hour : false;
      }).length,
    };
  });
}

function buildWeeklyData(bookings: DashboardSnapshot["bookings"]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({
    day,
    rides: bookings.filter((booking) => {
      const created = booking.created_at ? new Date(booking.created_at) : null;
      return created ? created.toLocaleDateString("en-US", { weekday: "short" }) === day : false;
    }).length,
  }));
}

export function Overview() {
  const { navigate } = useNavigate();
  const [exportSearch, setExportSearch] = useState("");
  const [exporting, setExporting] = useState<"passengers" | "drivers" | "bookings" | "ratings" | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await fetchDashboardSnapshot();
      if (alive) setSnapshot(data);
    };
    void load();
    const unsubscribe = subscribeToDashboardChanges(() => { void load(); });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const counts = snapshot?.counts;
  const bookings = snapshot?.bookings ?? [];
  const drivers = snapshot?.drivers ?? [];
  const rideData = useMemo(() => buildHourlyData(bookings), [bookings]);
  const weekData = useMemo(() => buildWeeklyData(bookings), [bookings]);
  const recentActivity = [...bookings].slice(0, 5);

  const stats = [
    { label: "Total Passengers", value: String(counts?.totalPassengers ?? 0), change: "Live count", up: true, icon: Car, color: MAROON, bg: "bg-primary/8", navTarget: "analytics" as const, hint: "View in Analytics" },
    { label: "Total Drivers", value: String(counts?.totalDrivers ?? 0), change: `${counts?.approvedDrivers ?? 0} approved`, up: true, icon: Users, color: GOLD, bg: "bg-accent/8", navTarget: "drivers" as const, hint: "Manage Drivers" },
    { label: "Pending Driver Approvals", value: String(counts?.pendingDriverApprovals ?? 0), change: "Awaiting review", up: true, icon: CheckCircle, color: "#15803d", bg: "bg-green-50", navTarget: "drivers" as const, hint: "Review Drivers" },
    { label: "Completed Bookings", value: String(counts?.completedBookings ?? 0), change: `${counts?.cancelledBookings ?? 0} cancelled`, up: true, icon: Clock, color: "#7c3aed", bg: "bg-violet-50", navTarget: "analytics" as const, hint: "View Analytics" },
  ];

  const handleAdminExport = async (type: "passengers" | "drivers" | "bookings" | "ratings") => {
    setExporting(type);
    const result = type === "passengers"
      ? await exportPassengersCsv(exportSearch)
      : type === "ratings"
      ? await exportRatingsCsv(exportSearch)
      : type === "drivers"
      ? exportDriversCsv(drivers.map((driver) => ({
          id: driver.id,
          name: `${driver.first_name || ""} ${driver.surname || ""}`.trim(),
          phone: "",
          vehicle: "",
          plate: "",
          route: "",
          rides: 0,
          rating: 0,
          status: String(driver.approval_status || ""),
          license: "Pending",
          joined: driver.created_at || "",
        })) as any)
      : exportBookingsCsv(bookings.map((booking) => ({
          id: booking.id,
          passenger: booking.passenger_name || "",
          passengerPhone: "",
          driver: booking.driver_name || "",
          driverPhone: "",
          vehicle: "",
          from: booking.pickup_address || "",
          to: booking.destination_address || "",
          fare: String(booking.final_price || 0),
          distance: "",
          duration: "",
          status: String(booking.status || "pending"),
          booked: booking.created_at || "",
          ended: booking.created_at || "",
          seats: 1,
          passengerCount: 1,
          totalFare: Number(booking.final_price || 0),
          individualShare: Number(booking.final_price || 0),
          splitPaymentEnabled: false,
          driverEarnings: Number(booking.final_price || 0),
        })) as any);

    setExporting(null);
    if (result.success) {
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} CSV exported`, { description: `${result.count} records downloaded from live data.`, duration: 3000 });
    } else {
      toast.error("Export failed", { description: result.error, duration: 3500 });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Dashboard Overview</h1>
          <p className={PAGE_SUBTITLE}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · Real-time data</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.success("Dashboard refreshed", { duration: 2000 })} className={BTN_OUTLINE_SM}><RefreshCw size={12} /> Refresh</button>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> System Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={() => navigate(s.navTarget)} className={`${CARD} p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 text-left group`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-150`}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><TrendingUp size={11} /> {s.change}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{s.label}</p>
              </div>
              <p className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: s.color }}>{s.hint} <ArrowUpRight size={10} /></p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={SECTION_TITLE}>Ride Volume - Today</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Hourly ride count from live bookings</p>
            </div>
            <button onClick={() => navigate("analytics")} className={BTN_GHOST_LINK} style={{ color: MAROON }}><ArrowUpRight size={11} /></button>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={rideData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs><linearGradient id="rideGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={MAROON} stopOpacity={0.18} /><stop offset="95%" stopColor={MAROON} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" />
              <XAxis dataKey="time" tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="rides" stroke={MAROON} strokeWidth={2.5} fill="url(#rideGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={SECTION_TITLE}>Weekly Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Rides per day from live bookings</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={weekData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="rides" radius={[4, 4, 0, 0]}>
                {weekData.map((entry, i) => <Cell key={i} fill={entry.day === "Fri" ? GOLD : MAROON} fillOpacity={entry.day === "Fri" ? 1 : 0.65} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <h3 className={SECTION_TITLE}>Admin Export CSV</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Export live records from the database.</p>
          </div>
          <div className="relative lg:ml-auto lg:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={exportSearch} onChange={(e) => setExportSearch(e.target.value)} placeholder="Search before export..." className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["passengers", "drivers", "bookings", "ratings"] as const).map((type) => (
              <button key={type} onClick={() => void handleAdminExport(type)} disabled={exporting !== null} className={`${BTN_OUTLINE_SM} disabled:opacity-60`}>
                <Download size={12} /> {exporting === type ? "Exporting..." : `Export ${type[0].toUpperCase()}${type.slice(1)}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
        <div className={`${CARD} lg:col-span-2 overflow-hidden`}>
          <div className={CARD_HEADER}>
            <h3 className={SECTION_TITLE}>Recent Ride Activity</h3>
            <button onClick={() => navigate("bookings")} className={BTN_GHOST_LINK} style={{ color: MAROON }}>View all <ArrowUpRight size={11} /></button>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-sm text-muted-foreground">No bookings yet.</div>
            ) : recentActivity.map((r) => (
              <button key={r.id} onClick={() => navigate("bookings")} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors text-left group">
                <span className="text-xs font-mono font-semibold text-muted-foreground w-16 shrink-0">{r.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{r.driver_name || "Unassigned"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.pickup_address || "No pickup"} → {r.destination_address || "No destination"}</p>
                </div>
                <StatusBadge status={(String(r.status || "pending").charAt(0).toUpperCase() + String(r.status || "pending").slice(1).toLowerCase()) as StatusKey} />
                <span className="text-xs font-semibold font-mono text-foreground w-10 text-right shrink-0">₱{Number(r.final_price || 0).toFixed(0)}</span>
                <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</span>
                <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEADER}>
            <div>
              <h3 className={SECTION_TITLE}>System Status</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All services monitored</p>
            </div>
          </div>
          <div className="px-5 py-3 space-y-0.5">
            {systemStatus.map((s) => (
              <button key={s.label} onClick={() => { if (s.action) navigate(s.action); else if (!s.ok) toast.warning(`${s.label} is degraded`, { description: "Check Settings for details.", duration: 3000 }); }} className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors group">
                <div className="flex items-center gap-2">
                  {!s.ok && <AlertTriangle size={11} className="text-amber-500 shrink-0" />}
                  <span className="text-sm text-foreground font-medium">{s.label}</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.ok ? "text-green-600" : "text-amber-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
                  {s.ok ? "Operational" : "Degraded"}
                  {s.action && <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />}
                </span>
              </button>
            ))}
          </div>
          <div className="px-5 pb-4 pt-2">
            <button onClick={() => navigate("analytics")} className="w-full rounded-lg bg-muted/50 border border-border/60 px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors">
              <Activity size={14} style={{ color: MAROON }} />
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Server Uptime</p>
                <p className="text-xs text-muted-foreground mt-0.5">99.7% this month</p>
              </div>
              <ArrowUpRight size={12} className="ml-auto text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
