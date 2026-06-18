import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, MapPin, Clock, Star, Zap, User, Navigation2, ChevronRight, ShieldCheck } from "lucide-react";
import { useUser } from "../../context/UserContext";
import {
  getPassengerBookingHistory,
  type BookingData,
  type BookingStatus,
} from "../../utils/bookingDatabase";
import { getSupabasePassengerBookingHistory } from "../../utils/supabaseBookings";
import { getUnreadNotificationCount } from "../../utils/supabaseNotifications";

const MAROON = "#4B0F14";
const GOLD = "#D4AF37";
const CREAM = "#FFF8E7";

const SANTA_MESA_QUICK_DESTINATIONS = [
  { name: "PUP Sta. Mesa", icon: "PUP" },
  { name: "SM City Sta. Mesa", icon: "SM" },
  { name: "V. Mapa LRT", icon: "LRT" },
  { name: "Sta. Mesa Market", icon: "MKT" },
];

const HISTORY_STATUSES: BookingStatus[] = ["completed", "ride_completed", "cancelled"];
const RECENT_RIDE_LIMIT = 3;

export default function PassengerDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const [recentRides, setRecentRides] = useState<BookingData[]>([]);
  const [loadingRecentRides, setLoadingRecentRides] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const firstName = currentUser?.firstName || "Passenger";
  const profilePhoto = currentUser?.profilePhoto;

  useEffect(() => {
    if (!currentUser) {
      setRecentRides([]);
      setLoadingRecentRides(false);
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const loadRecentRides = async () => {
      setLoadingRecentRides(true);

      const localRides = getPassengerBookingHistory(currentUser.username, currentUser.supabaseId)
        .filter(ride => HISTORY_STATUSES.includes(ride.status));
      const supabaseRides = await getSupabasePassengerBookingHistory(currentUser);
      const merged = mergeRecentRideHistory([...supabaseRides, ...localRides])
        .slice(0, RECENT_RIDE_LIMIT);

      if (!cancelled) {
        setRecentRides(merged);
        setLoadingRecentRides(false);
      }
    };

    void loadRecentRides();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;

    const loadUnreadNotifications = async () => {
      const count = await getUnreadNotificationCount(currentUser);
      if (!cancelled) {
        setUnreadNotifications(count);
      }
    };

    void loadUnreadNotifications();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);



  const promos = [
    { code: "RIDE20", label: "20% OFF", desc: "First ride discount" },
    { code: "STUDENT", label: "Beep 20%", desc: "Student discount" },
  ];

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>

      {/* Header */}
      <div
        className="px-5 pt-12 pb-8"
        style={{ background: `linear-gradient(160deg, ${MAROON} 0%, #6E171D 100%)` }}
      >
        {/* Top row */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Logo */}
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <span style={{ fontSize: 16 }}>AR</span>
            </div>
            <span className="truncate" style={{ color: CREAM, fontSize: 16, fontWeight: 900 }}>Arangkada</span>
          </div>
          <button
            onClick={() => navigate("/passenger/notifications")}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(255,248,231,0.15)" }}
          >
            <Bell size={18} color={CREAM} />
            {unreadNotifications > 0 && (
              <div
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1"
                style={{ background: GOLD, color: MAROON, fontSize: 10, fontWeight: 900 }}
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </div>
            )}
          </button>
        </div>

        {/* Greeting */}
        <div className="flex items-center gap-3 mb-5">
          {/* Avatar */}
          <div
            className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(212,175,55,0.2)", border: "2px solid rgba(212,175,55,0.3)" }}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span style={{ color: GOLD, fontSize: 20, fontWeight: 800 }}>{firstName.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p style={{ color: "rgba(255,248,231,0.65)", fontSize: 13 }}>Good day,</p>
            <p style={{ color: CREAM, fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{firstName}! </p>
          </div>
        </div>

        {/* Book ride search bar */}
        <button
          onClick={() => navigate("/passenger/book")}
          className="flex w-full min-w-0 items-center gap-3 rounded-2xl p-4"
          style={{ background: CREAM, boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}
        >
          <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(75,15,20,0.08)" }}>
            <MapPin size={22} color={MAROON} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p style={{ color: "#9a8a7a", fontSize: 12, fontWeight: 500 }}>Where are you going?</p>
            <p className="truncate" style={{ color: MAROON, fontSize: 15, fontWeight: 700, marginTop: 1 }}>Book your ride</p>
          </div>
          <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center" style={{ background: MAROON }}>
            <Navigation2 size={16} color={GOLD} />
          </div>
        </button>
      </div>

      <div className="px-5 pt-5 pb-36">

        {/* Ride type */}
        <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Ride Type</p>
        <div className="mb-5">
          <button
            onClick={() => navigate("/passenger/book", { state: { rideType: "solo" } })}
            className="flex w-full items-center gap-4 rounded-2xl p-4 text-left"
            style={{ background: "#ffffff", border: `2px solid ${MAROON}`, boxShadow: "0 2px 8px rgba(75,15,20,0.1)" }}
          >
            <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "rgba(75,15,20,0.08)" }}>
              <User size={22} color={MAROON} />
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ color: MAROON, fontSize: 14, fontWeight: 800 }}>Tricycle Ride</p>
              <p style={{ color: "#7a6a5a", fontSize: 11, marginTop: 1 }}>Private ride</p>
              <p style={{ color: "#9a8a7a", fontSize: 10 }}>Full fare</p>
            </div>
            <div className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center" style={{ background: MAROON }}>
              <Navigation2 size={16} color={GOLD} />
            </div>
          </button>
        </div>

        {/* Quick Destinations */}
        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700 }}>Quick Destinations</p>
            <button className="inline-action" onClick={() => navigate("/passenger/book")} style={{ color: MAROON, fontSize: 12, fontWeight: 600 }}>
              Book -&gt;
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SANTA_MESA_QUICK_DESTINATIONS.map((dest) => (
              <button
                key={dest.name}
                onClick={() => navigate("/passenger/book")}
                className="flex min-w-0 items-center gap-3 p-3.5 rounded-xl text-left"
                style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.1)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <span className="shrink-0" style={{ fontSize: 20 }}>{dest.icon}</span>
                <p className="min-w-0 break-words" style={{ color: "#1E1E1E", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{dest.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Promos */}
        <div className="mb-5">
          <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Promos</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {promos.map((promo) => (
              <div
                key={promo.code}
                className="flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: MAROON, minWidth: 160, boxShadow: "0 4px 12px rgba(75,15,20,0.25)" }}
              >
                <div>
                  <div className="rounded-lg px-2 py-0.5 mb-1 inline-block" style={{ background: GOLD }}>
                    <p style={{ color: MAROON, fontSize: 11, fontWeight: 800 }}>{promo.label}</p>
                  </div>
                  <p style={{ color: CREAM, fontSize: 12, fontWeight: 700 }}>{promo.code}</p>
                  <p style={{ color: "rgba(255,248,231,0.65)", fontSize: 11 }}>{promo.desc}</p>
                </div>
                <Zap size={28} color="rgba(212,175,55,0.3)" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent rides */}
        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700 }}>Recent Rides</p>
            <button className="inline-action" onClick={() => navigate("/passenger/history")} style={{ color: MAROON, fontSize: 12, fontWeight: 600 }}>
              View all -&gt;
            </button>
          </div>
          <div className="space-y-2.5">
            {loadingRecentRides ? (
              <RecentRideEmptyState message="Fetching your rides..." />
            ) : recentRides.length > 0 ? (
              recentRides.map((ride) => (
                <div
                  key={ride.id}
                  className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-start"
                  style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(75,15,20,0.06)" }}>
                    <Clock size={20} color={MAROON} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="min-w-0 break-words" style={{ color: "#9a8a7a", fontSize: 11 }}>
                        {formatRecentRideDateTime(ride)}
                      </p>
                      <RecentRideStatus status={ride.status} />
                    </div>
                    <div className="space-y-1">
                      <p style={{ color: "#1E1E1E", fontSize: 13, fontWeight: 700 }} className="break-words">
                        {ride.pickupLocation.address}
                      </p>
                      <p style={{ color: "#9a8a7a", fontSize: 11 }}>to</p>
                      <p style={{ color: "#1E1E1E", fontSize: 13, fontWeight: 700 }} className="break-words">
                        {ride.destination.address}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 text-left sm:block sm:text-right">
                    <p style={{ color: MAROON, fontSize: 16, fontWeight: 800 }}>PHP {ride.finalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <RecentRideEmptyState message="You have no recent rides." />
            )}
          </div>
        </div>

        {/* Safety card */}
        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ background: "rgba(75,15,20,0.05)", border: "1.5px solid rgba(75,15,20,0.12)" }}
        >
          <ShieldCheck className="shrink-0" size={28} color={MAROON} />
          <div className="min-w-0">
            <p style={{ color: MAROON, fontSize: 13, fontWeight: 700 }}>Safety First</p>
            <p style={{ color: "#7a6a5a", fontSize: 12, lineHeight: 1.4 }}>
              All drivers are verified. An emergency button is available on the tracking page.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function mergeRecentRideHistory(rides: BookingData[]): BookingData[] {
  const byId = new Map<string, BookingData>();
  rides.forEach((ride) => {
    const existing = byId.get(ride.id);
    if (!existing || getRecentRideSortTime(ride) >= getRecentRideSortTime(existing)) {
      byId.set(ride.id, ride);
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => getRecentRideSortTime(b) - getRecentRideSortTime(a));
}

function getRecentRideSortTime(ride: BookingData): number {
  const value = new Date(ride.completedAt || ride.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function formatRecentRideDateTime(ride: BookingData): string {
  const date = new Date(ride.completedAt || ride.createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function RecentRideStatus({ status }: { status: BookingStatus }) {
  const isCompleted = status === "completed" || status === "ride_completed";
  const label = status === "ride_completed"
    ? "Completed"
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: isCompleted ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)",
        color: isCompleted ? "#15803d" : "#b91c1c",
      }}
    >
      {label}
    </span>
  );
}

function RecentRideEmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <p style={{ color: "#7a6a5a", fontSize: 13, fontWeight: 600 }}>{message}</p>
    </div>
  );
}

