import { useState } from "react";
import { toast } from "sonner";
import {
  Search, Filter, Eye, ChevronDown, MapPin, User,
  Car, XCircle, ArrowUpRight, Phone,
} from "lucide-react";
import { useNavigate } from "../context/NavigationContext";
import { useAppState, type BookingStatus } from "../context/AppStateContext";
import { StatusBadge, type StatusKey } from "../components/ui/StatusBadge";
import { STATUS_CONFIG } from "../lib/ui";
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, BTN_OUTLINE_SM,
  BTN_ICON_SM, CARD, CARD_HEADER,
  SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE, TH,
} from "../lib/ui";

const MAROON = "#6B0E1A";

// Flash colours matching the driver table pattern
const FLASH_BG: Record<string, string> = {
  success: "bg-green-50  ring-1 ring-green-300",
  warning: "bg-amber-50  ring-1 ring-amber-300",
  error:   "bg-rose-50   ring-1 ring-rose-300",
};

const BOOKING_TABS = ["All", "Ongoing", "Completed", "Cancelled", "Pending"] as const;
type BookingTab = typeof BOOKING_TABS[number];

const SUMMARY_STATUSES: BookingStatus[] = ["Ongoing", "Completed", "Cancelled", "Pending"];

export function Bookings() {
  const { navigate } = useNavigate();
  const { bookings, recentChanges, cancelBooking } = useAppState();

  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState<BookingTab>("All");
  const [detail,  setDetail]  = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      b.id.toLowerCase().includes(q) ||
      b.passenger.toLowerCase().includes(q) ||
      b.driver.toLowerCase().includes(q);
    const matchTab = tab === "All" ? true : b.status === tab;
    return matchSearch && matchTab;
  });

  const detailBooking = bookings.find((b) => b.id === detail) ?? null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className={PAGE_TITLE}>Booking Monitoring</h1>
        <p className={PAGE_SUBTITLE}>Live view of all booking transactions · {bookings.length} records today</p>
      </div>

      {/* Status summary pills — clicking filters the table */}
      <div className="flex gap-3 flex-wrap items-center">
        {SUMMARY_STATUSES.map((s) => {
          const count  = bookings.filter((b) => b.status === s).length;
          const cfg    = STATUS_CONFIG[s as StatusKey];
          const active = tab === s;
          return (
            <button
              key={s}
              onClick={() => setTab(s as BookingTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] ${cfg.bg} ${cfg.border} ${cfg.text} ${active ? "ring-2 ring-current ring-offset-1 ring-offset-background" : ""}`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot}${cfg.pulse ? " animate-pulse" : ""}`} />
              {s}
              <span className="font-mono font-bold transition-all duration-300">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <div className={`${CARD} overflow-hidden`}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {BOOKING_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  tab === t ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={tab === t ? { background: MAROON } : {}}
              >
                {t}
                {/* Live counts on tab labels */}
                {t !== "All" && (
                  <span className="ml-1 opacity-60" style={{ fontSize: 10 }}>
                    {bookings.filter(b => b.status === t).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking, passenger…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring w-52 transition-shadow"
              />
            </div>
            <button className={BTN_OUTLINE_SM}>
              <Filter size={12} /> Filter <ChevronDown size={10} />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No bookings match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Booking ID", "Passenger", "Driver", "Route", "Fare", "Seats", "Status", "Booked At", ""].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b) => {
                  const flash      = recentChanges[b.id];
                  const isSelected = detail === b.id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setDetail(isSelected ? null : b.id)}
                      className={`transition-all duration-500 cursor-pointer ${
                        flash      ? FLASH_BG[flash] :
                        isSelected ? "bg-primary/[0.04]" :
                        "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{b.id}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">{b.passenger}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{b.driver}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 text-xs text-foreground max-w-52">
                          <MapPin size={11} className="text-muted-foreground shrink-0" />
                          <span className="truncate">{b.from} → {b.to}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold font-mono text-foreground">{b.fare}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{b.seats}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{b.booked}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDetail(isSelected ? null : b.id)}
                            className={`${BTN_ICON_SM} ${isSelected ? "border-primary text-primary bg-primary/8" : "hover:text-primary hover:border-primary"}`}
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                          {(b.status === "Ongoing" || b.status === "Pending") && (
                            <button
                              onClick={(e) => { e.stopPropagation(); cancelBooking(b.id); }}
                              className={`${BTN_ICON_SM} text-red-500 border-red-200 bg-red-50 hover:bg-red-100`}
                              title="Cancel booking"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel — driven by context so always reflects latest status */}
      {detailBooking && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <h3 className={SECTION_TITLE}>Ride Details</h3>
              <span className="text-xs font-mono text-muted-foreground">{detailBooking.id}</span>
              <StatusBadge status={detailBooking.status} />
            </div>
            <button onClick={() => setDetail(null)} className={`${BTN_ICON_SM} hover:text-foreground`} title="Close">
              <XCircle size={14} />
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: User,   label: "Passenger",       primary: detailBooking.passenger,                        secondary: detailBooking.passengerPhone },
              { icon: Car,    label: "Driver & Vehicle", primary: detailBooking.driver,                           secondary: `${detailBooking.vehicle} · ${detailBooking.driverPhone}` },
              { icon: MapPin, label: "Route",            primary: detailBooking.from,                             secondary: `→ ${detailBooking.to}` },
              { icon: Phone,  label: "Fare & Earnings",  primary: `Total: ${detailBooking.fare} · Driver: ₱${detailBooking.driverEarnings}`, secondary: `${detailBooking.bookingType === "group" ? `Group (${detailBooking.passengerCount} Pax)` : "Solo"} · ${detailBooking.splitPaymentEnabled ? `Split: ₱${detailBooking.individualShare} each` : "No Split"}` },
            ].map(({ icon: Icon, label, primary, secondary }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/60">
                <Icon size={14} className="mt-0.5 shrink-0" style={{ color: MAROON }} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{primary}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{secondary}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 flex items-center gap-2">
            <button onClick={() => navigate("map")} className={BTN_SECONDARY}>
              <ArrowUpRight size={14} /> View on Map
            </button>
            {(detailBooking.status === "Ongoing" || detailBooking.status === "Pending") && (
              <button
                onClick={() => { cancelBooking(detailBooking.id); setDetail(null); }}
                className={BTN_DANGER}
                style={{ background: "#dc2626" }}
              >
                <XCircle size={14} /> Cancel Booking
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
