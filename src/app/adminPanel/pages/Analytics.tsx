import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Award, MapPin, Clock, Download, ArrowUpRight } from "lucide-react";
import { useNavigate } from "../context/NavigationContext";
import {
  BTN_OUTLINE_SM, BTN_GHOST_LINK, CARD, CARD_HEADER,
  SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE, TH,
} from "../lib/ui";

const MAROON = "#6B0E1A";
const GOLD = "#C49A1A";
const LIGHT = "#9C2D3B";

const monthlyRides = [
  { month: "Jan", rides: 18420, revenue: 829000 },
  { month: "Feb", rides: 16800, revenue: 756000 },
  { month: "Mar", rides: 21300, revenue: 958000 },
  { month: "Apr", rides: 19900, revenue: 895000 },
  { month: "May", rides: 24100, revenue: 1084500 },
  { month: "Jun", rides: 22800, revenue: 1026000 },
];

const peakHours = [
  { hour: "5AM", pct: 8 }, { hour: "6AM", pct: 22 }, { hour: "7AM", pct: 68 },
  { hour: "8AM", pct: 100 }, { hour: "9AM", pct: 74 }, { hour: "10AM", pct: 42 },
  { hour: "11AM", pct: 38 }, { hour: "12PM", pct: 58 }, { hour: "1PM", pct: 62 },
  { hour: "2PM", pct: 52 }, { hour: "3PM", pct: 70 }, { hour: "4PM", pct: 92 },
  { hour: "5PM", pct: 88 }, { hour: "6PM", pct: 65 }, { hour: "7PM", pct: 40 },
  { hour: "8PM", pct: 24 }, { hour: "9PM", pct: 14 }, { hour: "10PM", pct: 6 },
];

const topDrivers = [
  { id: "DRV-006", name: "Jose Dela Cruz", rides: 1203, rating: 4.9, onTime: 97, revenue: "₱54,135", completion: 98 },
  { id: "DRV-001", name: "Rodrigo Santos", rides: 892, rating: 4.8, onTime: 94, revenue: "₱40,140", completion: 96 },
  { id: "DRV-002", name: "Maria Reyes", rides: 641, rating: 4.7, onTime: 91, revenue: "₱28,845", completion: 94 },
  { id: "DRV-004", name: "Ana Lim", rides: 334, rating: 4.5, onTime: 88, revenue: "₱15,030", completion: 91 },
];

const locationData = [
  { name: "PUP Sta. Mesa ↔ V. Mapa LRT", rides: 5840, color: MAROON },
  { name: "Pureza ↔ Teresa St", rides: 4210, color: GOLD },
  { name: "Teresa St ↔ Pureza LRT", rides: 3800, color: LIGHT },
  { name: "Magsaysay Blvd ↔ Altura St", rides: 2950, color: "#7c3aed" },
  { name: "Stop and Shop ↔ Bataan St", rides: 2200, color: "#0e7490" },
];

const radarData = [
  { metric: "Punctuality", jose: 97, rodrigo: 94, maria: 91 },
  { metric: "Rating", jose: 98, rodrigo: 96, maria: 94 },
  { metric: "Completion", jose: 98, rodrigo: 96, maria: 94 },
  { metric: "Volume", jose: 100, rodrigo: 74, maria: 53 },
  { metric: "Revenue", jose: 100, rodrigo: 74, maria: 53 },
];

type PeriodKey = "jan-jun" | "q1" | "q2";
const periods: { key: PeriodKey; label: string }[] = [
  { key: "jan-jun", label: "Jan–Jun 2025" },
  { key: "q1", label: "Q1 2025" },
  { key: "q2", label: "Q2 2025" },
];

function CardStat({ label, value, sub, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`${CARD} p-4 text-left hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 group`}
    >
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
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export function Analytics() {
  const { navigate } = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("jan-jun");

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Analytics & Reports</h1>
          <p className={PAGE_SUBTITLE}>{periods.find(p => p.key === period)?.label} · All routes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1 border border-border">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => toast.success("Report generated", { description: "PDF report is ready for download.", duration: 3000 })}
            className={BTN_OUTLINE_SM}
          >
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardStat label="Total Rides" value="123,320" sub="Jan–Jun 2025" icon={TrendingUp} color={MAROON} onClick={() => navigate("bookings")} />
        <CardStat label="Avg. Rating" value="4.74 ★" sub="Across all drivers" icon={Award} color={GOLD} onClick={() => navigate("drivers")} />
        <CardStat label="Peak Hour" value="8:00 AM" sub="Highest demand daily" icon={Clock} color="#7c3aed" onClick={() => toast.info("Peak hour: 8–9 AM · Avg 203 rides/hr")} />
        <CardStat label="Top Route" value="PUP ↔ V. Mapa" sub="5,840 rides this period" icon={MapPin} color="#0e7490" onClick={() => navigate("map")} />
      </div>

      {/* Monthly rides + revenue */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={SECTION_TITLE}>Monthly Ride Volume & Revenue</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{periods.find(p => p.key === period)?.label}</p>
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
            <YAxis yAxisId="left" tick={{ fill: "#7A6468", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#7A6468", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTip />} />
            <Bar yAxisId="left" dataKey="rides" name="Rides" fill={MAROON} fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={28} />
            <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill={GOLD} fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peak hours + route pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} p-5 lg:col-span-2`}>
          <div className="mb-4">
            <h3 className={SECTION_TITLE}>Peak Hours Heatmap</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Average demand by hour, all days</p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={peakHours} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,14,26,0.07)" />
              <XAxis dataKey="hour" tick={{ fill: "#7A6468", fontSize: 9, fontFamily: "Nunito" }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#7A6468", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTip />} />
              <Line type="monotone" dataKey="pct" name="Demand %" stroke={MAROON} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: MAROON, stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-3">
            {[
              { label: "Morning Rush",   time: "7–9 AM",   pct: "100%", color: MAROON },
              { label: "Afternoon Rush", time: "4–5 PM",   pct: "92%",  color: GOLD   },
              { label: "Lunch Peak",     time: "12–1 PM",  pct: "62%",  color: LIGHT  },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => toast.info(p.label, { description: `${p.time} · ${p.pct} demand` })}
                className="flex-1 rounded-lg px-3 py-2 border border-border bg-muted/40 text-left hover:bg-muted transition-colors active:scale-[0.98]"
              >
                <p className="text-xs font-bold" style={{ color: p.color }}>{p.pct}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.time}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-3">
            <h3 className={SECTION_TITLE}>Rides by Route</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top 5 routes this period</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={locationData} cx="50%" cy="50%"
                innerRadius={38} outerRadius={62} dataKey="rides"
                strokeWidth={2} stroke="#FFFFFF"
              >
                {locationData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {locationData.map((r) => (
              <button
                key={r.name}
                onClick={() => navigate("map")}
                className="w-full flex items-center gap-2 py-0.5 hover:bg-muted/40 rounded px-1 transition-colors group"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-xs text-muted-foreground flex-1 truncate text-left">{r.name}</span>
                <span className="text-xs font-mono font-bold text-foreground">{r.rides.toLocaleString()}</span>
                <ArrowUpRight size={9} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Driver leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${CARD} lg:col-span-2 overflow-hidden`}>
          <div className={CARD_HEADER}>
            <div>
              <h3 className={SECTION_TITLE}>Driver Performance Leaderboard</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ranked by total rides · Jan–Jun 2025</p>
            </div>
            <button onClick={() => navigate("drivers")} className={BTN_GHOST_LINK} style={{ color: MAROON }}>
              Manage Drivers <ArrowUpRight size={11} />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Rank", "Driver", "Rides", "Rating", "On-Time %", "Completion %", "Revenue"].map((h) => (
                  <th key={h} className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topDrivers.map((d, i) => (
                <tr
                  key={d.name}
                  onClick={() => navigate("drivers")}
                  className="hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={i === 0 ? { background: GOLD, color: "#fff" } : i === 1 ? { background: "#E5E7EB", color: "#374151" } : i === 2 ? { background: "#FEE2B0", color: "#92400E" } : { background: "#F3F4F6", color: "#6B7280" }}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-foreground group-hover:text-primary transition-colors">{d.name}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-foreground">{d.rides.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-bold text-amber-600">★ {d.rating}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-16">
                        <div className="h-full rounded-full transition-all" style={{ width: `${d.onTime}%`, background: MAROON }} />
                      </div>
                      <span className="text-xs font-mono text-foreground">{d.onTime}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-16">
                        <div className="h-full rounded-full transition-all" style={{ width: `${d.completion}%`, background: GOLD }} />
                      </div>
                      <span className="text-xs font-mono text-foreground">{d.completion}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-foreground">{d.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-3">
            <h3 className={SECTION_TITLE}>Driver Comparison</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top 3 · normalized scores</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(107,14,26,0.12)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#7A6468", fontSize: 10, fontFamily: "Nunito" }} />
              <Radar name="Jose" dataKey="jose" stroke={MAROON} fill={MAROON} fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Rodrigo" dataKey="rodrigo" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Maria" dataKey="maria" stroke={LIGHT} fill={LIGHT} fillOpacity={0.1} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "Nunito" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
