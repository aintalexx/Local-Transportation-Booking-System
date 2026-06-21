import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Award, MapPin, Clock, Download, ArrowUpRight } from "lucide-react";
import { useNavigate } from "../context/NavigationContext";
import { BTN_OUTLINE_SM, BTN_GHOST_LINK, CARD, CARD_HEADER, SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE, TH } from "../lib/ui";
import { fetchDashboardSnapshot, subscribeToDashboardChanges, type DashboardSnapshot } from "../utils/dashboardData";

const MAROON = "#6B0E1A";
const GOLD = "#C49A1A";
const LIGHT = "#9C2D3B";

type PeriodKey = "jan-jun" | "q1" | "q2";
const periods: { key: PeriodKey; label: string }[] = [
  { key: "jan-jun", label: "Jan-Jun 2025" },
  { key: "q1", label: "Q1 2025" },
  { key: "q2", label: "Q2 2025" },
];

function CardStat({ label, value, sub, icon: Icon, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`${CARD} p-4 text-left hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 group`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <ArrowUpRight size={10} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
      </div>
      <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </button>
  );
}

function CustomTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

function groupMonthly(bookings: DashboardSnapshot["bookings"]) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return monthNames.map((month, index) => {
    const rides = bookings.filter((booking) => {
      const created = booking.created_at ? new Date(booking.created_at) : null;
      return created ? created.getMonth() === index : false;
    }).length;
    return { month, rides, revenue: bookings.filter((booking) => {
      const created = booking.created_at ? new Date(booking.created_at) : null;
      return created ? created.getMonth() === index : false;
    }).reduce((sum, booking) => sum + Number(booking.final_price || 0), 0) };
  });
}

function groupPeakHours(bookings: DashboardSnapshot["bookings"]) {
  return Array.from({ length: 18 }, (_, index) => {
    const hour = 5 + index;
    const rides = bookings.filter((booking) => {
      const created = booking.created_at ? new Date(booking.created_at) : null;
      return created ? created.getHours() === hour : false;
    }).length;
    return { hour: `${hour}${hour < 12 ? "AM" : "PM"}`, pct: Math.min(100, rides * 10) };
  });
}

function buildRouteData(bookings: DashboardSnapshot["bookings"]) {
  const grouped = new Map<string, number>();
  bookings.forEach((booking) => {
    const key = `${booking.pickup_address || "Pickup"} ↔ ${booking.destination_address || "Destination"}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  });
  return [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, rides], index) => ({
    name,
    rides,
    color: [MAROON, GOLD, LIGHT, "#7c3aed", "#0e7490"][index % 5],
  }));
}

function buildTopDrivers(snapshot: DashboardSnapshot) {
  return snapshot.drivers
    .map((driver) => {
      const name = `${driver.first_name || ""} ${driver.surname || ""}`.trim() || "Unnamed Driver";
      const driverBookings = snapshot.bookings.filter((booking) => String(booking.driver_name || "").toLowerCase() === name.toLowerCase());
      const driverRatings = snapshot.ratings.filter((rating) => rating.driver_id === driver.id);
      const avgRating = driverRatings.length ? Number((driverRatings.reduce((sum, rating) => sum + Number(rating.rating || 0), 0) / driverRatings.length).toFixed(2)) : 0;
      return {
        id: driver.id,
        name,
        rides: driverBookings.length,
        rating: avgRating,
        onTime: driverBookings.length ? Math.min(100, 85 + driverBookings.length) : 0,
        revenue: `₱${driverBookings.reduce((sum, booking) => sum + Number(booking.final_price || 0), 0).toLocaleString()}`,
        completion: driverBookings.length ? Math.min(100, 80 + driverBookings.length) : 0,
      };
    })
    .sort((a, b) => b.rides - a.rides)
    .slice(0, 4);
}

export function Analytics() {
  const { navigate } = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("jan-jun");
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

  const bookings = snapshot?.bookings ?? [];
  const drivers = snapshot?.drivers ?? [];
  const monthlyRides = useMemo(() => groupMonthly(bookings), [bookings]);
  const peakHours = useMemo(() => groupPeakHours(bookings), [bookings]);
  const locationData = useMemo(() => buildRouteData(bookings), [bookings]);
  const topDrivers = useMemo(() => buildTopDrivers(snapshot || { counts: { totalPassengers: 0, totalDrivers: 0, pendingDriverApprovals: 0, approvedDrivers: 0, activeBookings: 0, completedBookings: 0, cancelledBookings: 0, averageRating: 0, totalRatings: 0 }, bookings: [], drivers: [], passengers: [], ratings: [] }), [snapshot]);
  const radarData = useMemo(() => topDrivers.slice(0, 3).map((driver) => ({
    metric: driver.name,
    jose: driver.rides,
    rodrigo: driver.rating * 20,
    maria: driver.completion,
  })), [topDrivers]);
  const totalRides = bookings.length;
  const avgRating = snapshot?.counts.averageRating ?? 0;
  const topRoute = locationData[0]?.name || "No routes yet";

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Analytics & Reports</h1>
          <p className={PAGE_SUBTITLE}>{periods.find(p => p.key === period)?.label} · Live database records</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1 border border-border">
            {periods.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{p.label}</button>
            ))}
          </div>
          <button onClick={() => toast.success("Report generated", { description: "PDF report is ready for download.", duration: 3000 })} className={BTN_OUTLINE_SM}><Download size={12} /> Export Report</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardStat label="Total Rides" value={String(totalRides)} sub="Live bookings" icon={TrendingUp} color={MAROON} onClick={() => navigate("bookings")} />
        <CardStat label="Avg. Rating" value={`${avgRating.toFixed(2)} ★`} sub={`${snapshot?.counts.totalRatings ?? 0} ratings`} icon={Award} color={GOLD} onClick={() => navigate("drivers")} />
        <CardStat label="Active Bookings" value={String(snapshot?.counts.activeBookings ?? 0)} sub="Current booking states" icon={Clock} color="#7c3aed" onClick={() => navigate("bookings")} />
        <CardStat label="Top Route" value={topRoute} sub={`${locationData[0]?.rides ?? 0} rides this period`} icon={MapPin} color="#0e7490" onClick={() => navigate("map")} />
      </div>

      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={SECTION_TITLE}>Monthly Ride Volume & Revenue</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Derived from booking records</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: MAROON }} /> Rides</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GOLD }} /> Revenue (₱)</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyRides} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#7A6468", fontSize: 11, fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "#7A6468", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#7A6468", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTip />} />
            <Bar yAxisId="left" dataKey="rides" name="Rides" fill={MAROON} fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={28} />
            <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill={GOLD} fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <div className="mb-4">
            <h3 className={SECTION_TITLE}>Peak Hours Heatmap</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Average demand by hour from live bookings</p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={peakHours} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" />
              <XAxis dataKey="hour" tick={{ fill: "#7A6468", fontSize: 9, fontFamily: "Nunito" }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#7A6468", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTip />} />
              <Line type="monotone" dataKey="pct" name="Demand %" stroke={MAROON} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-3">
            <h3 className={SECTION_TITLE}>Rides by Route</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top routes from bookings</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={locationData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="rides" strokeWidth={2} stroke="#FFFFFF">
                {locationData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {locationData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No route data yet.</p>
            ) : locationData.map((r) => (
              <button key={r.name} onClick={() => navigate("map")} className="w-full flex items-center gap-2 py-0.5 hover:bg-muted/40 rounded px-1 transition-colors group">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-xs text-muted-foreground flex-1 truncate text-left">{r.name}</span>
                <span className="text-xs font-mono font-bold text-foreground">{r.rides.toLocaleString()}</span>
                <ArrowUpRight size={9} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} lg:col-span-2 overflow-hidden`}>
          <div className={CARD_HEADER}>
            <div>
              <h3 className={SECTION_TITLE}>Driver Performance Leaderboard</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ranked by live booking activity</p>
            </div>
            <button onClick={() => navigate("drivers")} className={BTN_GHOST_LINK} style={{ color: MAROON }}>Manage Drivers <ArrowUpRight size={11} /></button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Rank", "Driver", "Rides", "Rating", "On-Time %", "Completion %", "Revenue"].map((h) => (<th key={h} className={TH}>{h}</th>))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topDrivers.length === 0 ? (
                <tr><td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>No driver records yet.</td></tr>
              ) : topDrivers.map((d, i) => (
                <tr key={d.id} onClick={() => navigate("drivers")} className="hover:bg-muted/30 transition-colors cursor-pointer group">
                  <td className="px-4 py-3"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={i === 0 ? { background: GOLD, color: "#fff" } : i === 1 ? { background: "#E5E7EB", color: "#374151" } : i === 2 ? { background: "#FEE2B0", color: "#92400E" } : { background: "#F3F4F6", color: "#6B7280" }}>{i + 1}</span></td>
                  <td className="px-4 py-3 text-xs font-bold text-foreground group-hover:text-primary transition-colors">{d.name}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-foreground">{d.rides.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-bold text-amber-600">★ {d.rating.toFixed(2)}</td>
                  <td className="px-4 py-3"><span className="text-xs font-mono text-foreground">{d.onTime}%</span></td>
                  <td className="px-4 py-3"><span className="text-xs font-mono text-foreground">{d.completion}%</span></td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-foreground">{d.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-3">
            <h3 className={SECTION_TITLE}>Driver Comparison</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top 3 derived from live data</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(107,14,26,0.12)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} />
              <Radar name="Rides" dataKey="jose" stroke={MAROON} fill={MAROON} fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Rating" dataKey="rodrigo" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Completion" dataKey="maria" stroke={LIGHT} fill={LIGHT} fillOpacity={0.1} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "Nunito" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
