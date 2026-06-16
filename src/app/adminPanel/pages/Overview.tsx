import {
  Car, Users, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, RefreshCw, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { useNavigate } from "../context/NavigationContext";
import { useAppState } from "../context/AppStateContext";
import { toast } from "sonner";
import { StatusBadge, type StatusKey } from "../components/ui/StatusBadge";
import { BTN_OUTLINE_SM, BTN_GHOST_LINK, CARD, CARD_HEADER, SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE } from "../lib/ui";

const MAROON = "#6B0E1A";
const GOLD   = "#C49A1A";

const rideData = [
  { time: "6AM",  rides: 42  }, { time: "7AM",  rides: 118 }, { time: "8AM",  rides: 203 },
  { time: "9AM",  rides: 167 }, { time: "10AM", rides: 95  }, { time: "11AM", rides: 88  },
  { time: "12PM", rides: 142 }, { time: "1PM",  rides: 156 }, { time: "2PM",  rides: 130 },
  { time: "3PM",  rides: 178 }, { time: "4PM",  rides: 224 }, { time: "5PM",  rides: 196 },
  { time: "6PM",  rides: 160 }, { time: "7PM",  rides: 98  }, { time: "8PM",  rides: 54  },
];

const weekData = [
  { day: "Mon", rides: 892  }, { day: "Tue", rides: 1034 }, { day: "Wed", rides: 1198 },
  { day: "Thu", rides: 1056 }, { day: "Fri", rides: 1284 }, { day: "Sat", rides: 740  }, { day: "Sun", rides: 510 },
];

const systemStatus = [
  { label: "Booking API",       ok: true,  action: null              },
  { label: "GPS Tracking",      ok: true,  action: "map"      as const },
  { label: "Payment Gateway",   ok: false, action: "settings" as const },
  { label: "SMS Notifications", ok: true,  action: "settings" as const },
  { label: "Driver App Server", ok: true,  action: null              },
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

export function Overview() {
  const { navigate }   = useNavigate();
  const { drivers, bookings, pendingDriverCount } = useAppState();

  // ─── Live-computed stats ────────────────────────────────────────────────────
  const activeDriverCount    = drivers.filter(d => d.status === "Active").length;
  const completedRidesCount  = bookings.filter(b => b.status === "Completed").length;
  const totalRides           = bookings.length;

  const stats = [
    {
      label:     "Total Rides Today",
      value:     "1,284",
      change:    "+12.4%",
      up:        true,
      icon:      Car,
      color:     MAROON,
      bg:        "bg-primary/8",
      navTarget: "analytics" as const,
      hint:      "View in Analytics",
    },
    {
      label:     "Active Drivers",
      value:     String(activeDriverCount),
      change:    `${pendingDriverCount > 0 ? `${pendingDriverCount} pending` : "All clear"}`,
      up:        pendingDriverCount === 0,
      icon:      Users,
      color:     GOLD,
      bg:        "bg-accent/8",
      navTarget: "drivers" as const,
      hint:      "Manage Drivers",
    },
    {
      label:     "Completed Rides",
      value:     String(completedRidesCount),
      change:    `${Math.round((completedRidesCount / Math.max(totalRides, 1)) * 100)}% rate`,
      up:        true,
      icon:      CheckCircle,
      color:     "#15803d",
      bg:        "bg-green-50",
      navTarget: "bookings" as const,
      hint:      "View Bookings",
    },
    {
      label:     "Avg. Wait Time",
      value:     "4.2 min",
      change:    "−0.8 min",
      up:        true,
      icon:      Clock,
      color:     "#7c3aed",
      bg:        "bg-violet-50",
      navTarget: "analytics" as const,
      hint:      "View Analytics",
    },
  ];

  // Show the 5 most recent bookings from live context (reverse-chronological)
  const recentActivity = [...bookings].slice(0, 5);

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Dashboard Overview</h1>
          <p className={PAGE_SUBTITLE}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · Real-time data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.success("Dashboard refreshed", { duration: 2000 })}
            className={BTN_OUTLINE_SM}
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      {/* ── KPI stat cards — values derived from live context ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => navigate(s.navTarget)}
              className={`${CARD} p-5 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 text-left group`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-150`}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold ${s.up ? "text-green-600" : "text-amber-600"}`}>
                  {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {s.change}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight transition-all duration-300">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{s.label}</p>
              </div>
              <p className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1" style={{ color: s.color }}>
                {s.hint} <ArrowUpRight size={10} />
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Pending drivers alert — only shows when there are pending ── */}
      {pendingDriverCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate("drivers")}
        >
          <span className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle size={13} className="text-amber-600" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-800">
              {pendingDriverCount} driver application{pendingDriverCount > 1 ? "s" : ""} awaiting approval
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Review and approve or reject pending drivers.</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1 hover:underline">
            Review now <ArrowUpRight size={11} />
          </span>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={SECTION_TITLE}>Ride Volume — Today</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Hourly ride count, Friday June 14</p>
            </div>
            <button onClick={() => navigate("analytics")} className={BTN_GHOST_LINK} style={{ color: MAROON }}>
              Full analytics <ArrowUpRight size={11} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={rideData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="rideGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={MAROON} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={MAROON} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" />
              <XAxis dataKey="time" tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="rides" stroke={MAROON} strokeWidth={2.5} fill="url(#rideGrad)" dot={false} activeDot={{ r: 4, fill: MAROON }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={SECTION_TITLE}>Weekly Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Rides per day this week</p>
            </div>
            <button onClick={() => navigate("analytics")} className={BTN_GHOST_LINK} style={{ color: MAROON }}>
              Details <ArrowUpRight size={11} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={weekData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="rides" radius={[4, 4, 0, 0]}>
                {weekData.map((entry, i) => (
                  <Cell key={i} fill={entry.day === "Fri" ? GOLD : MAROON} fillOpacity={entry.day === "Fri" ? 1 : 0.65} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
        {/* Live recent bookings from context */}
        <div className={`${CARD} lg:col-span-2 overflow-hidden`}>
          <div className={CARD_HEADER}>
            <h3 className={SECTION_TITLE}>Recent Ride Activity</h3>
            <button onClick={() => navigate("bookings")} className={BTN_GHOST_LINK} style={{ color: MAROON }}>
              View all <ArrowUpRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate("bookings")}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors text-left group"
              >
                <span className="text-xs font-mono font-semibold text-muted-foreground w-16 shrink-0">{r.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{r.driver}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.from} → {r.to}</p>
                </div>
                <StatusBadge status={r.status as StatusKey} />
                <span className="text-xs font-semibold font-mono text-foreground w-10 text-right shrink-0">{r.fare}</span>
                <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">{r.booked.split(",")[1]?.trim() ?? r.booked}</span>
                <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className={CARD}>
          <div className={CARD_HEADER}>
            <div>
              <h3 className={SECTION_TITLE}>System Status</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All services monitored</p>
            </div>
          </div>
          <div className="px-5 py-3 space-y-0.5">
            {systemStatus.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  if (s.action) navigate(s.action);
                  else if (!s.ok) toast.warning(`${s.label} is degraded`, { description: "Check Settings for details.", duration: 3000 });
                }}
                className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors group"
              >
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
            <button
              onClick={() => navigate("analytics")}
              className="w-full rounded-lg bg-muted/50 border border-border/60 px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors"
            >
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
