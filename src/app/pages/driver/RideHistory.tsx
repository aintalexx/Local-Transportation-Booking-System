import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { MapPin, Clock, Calendar } from "lucide-react";
import { useUser } from "../../context/UserContext";
import {
  getDriverBookingHistory,
  type BookingData,
  type BookingStatus,
} from "../../utils/bookingDatabase";
import { getSupabaseDriverBookingHistory } from "../../utils/supabaseBookings";

type HistoryFilter = "all" | "completed" | "cancelled";

const HISTORY_STATUSES: BookingStatus[] = ["completed", "ride_completed", "cancelled"];

export default function DriverRideHistory() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [rides, setRides] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setLoading(true);
      const localRides = getDriverBookingHistory(user.username, user.supabaseId)
        .filter(ride => HISTORY_STATUSES.includes(ride.status));
      const supabaseRides = await getSupabaseDriverBookingHistory(user);
      const merged = mergeRideHistory([...supabaseRides, ...localRides]);

      if (!cancelled) {
        setRides(merged);
        setLoading(false);
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

  const filteredRides = useMemo(() => {
    if (filter === "all") return rides;
    if (filter === "completed") {
      return rides.filter(ride => ride.status === "completed" || ride.status === "ride_completed");
    }
    return rides.filter(ride => ride.status === "cancelled");
  }, [filter, rides]);

  const completedRides = rides.filter(ride => ride.status === "completed" || ride.status === "ride_completed");
  const totalEarnings = completedRides.reduce((sum, ride) => sum + ride.finalPrice, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] p-6 text-white">
        <div className="mx-auto max-w-screen-md">
          <h1 className="mb-4 text-2xl font-bold">Trip History</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border-white/20 bg-white/10 backdrop-blur">
              <CardContent className="pt-4">
                <p className="text-sm text-[rgba(255,248,231,0.7)]">Completed Trips</p>
                <p className="break-words text-2xl font-bold text-white">{completedRides.length}</p>
              </CardContent>
            </Card>
            <Card className="border-white/20 bg-white/10 backdrop-blur">
              <CardContent className="pt-4">
                <p className="text-sm text-[rgba(255,248,231,0.7)]">Total Earnings</p>
                <p className="break-words text-2xl font-bold text-white">PHP {totalEarnings.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-md p-4 pb-20">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as HistoryFilter)} className="mb-4">
          <TabsList className="w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {loading ? (
            <HistoryEmptyState message="Loading trip history..." />
          ) : filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <Card key={ride.id} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatRideDate(ride)}</span>
                      <span className="text-sm text-gray-400">{formatRideTime(ride)}</span>
                    </div>
                    <StatusBadge status={ride.status} />
                  </div>

                  <div className="mb-3 space-y-2">
                    <LocationRow
                      tone="pickup"
                      label="Pickup"
                      address={ride.pickupLocation.address}
                    />
                    <LocationRow
                      tone="destination"
                      label="Destination"
                      address={ride.destination.address}
                    />
                  </div>

                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoBlock label="Passenger" value={ride.passengerName || "Passenger"} />
                      <InfoBlock label="Payment" value={ride.paymentMethod || "Cash"} />
                    </div>
                    <div className="min-w-fit text-left sm:text-right">
                      <p className="text-xl font-bold text-green-600">PHP {ride.finalPrice.toFixed(2)}</p>
                      <p className="mt-1 text-xs text-gray-500">{ride.distance.toFixed(1)} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <HistoryEmptyState message="No trip history found" />
          )}
        </div>
      </div>
    </div>
  );
}

function mergeRideHistory(rides: BookingData[]): BookingData[] {
  const byId = new Map<string, BookingData>();
  rides.forEach((ride) => {
    const existing = byId.get(ride.id);
    if (!existing || getRideSortTime(ride) >= getRideSortTime(existing)) {
      byId.set(ride.id, ride);
    }
  });

  return Array.from(byId.values())
    .sort((a, b) => getRideSortTime(b) - getRideSortTime(a));
}

function getRideSortTime(ride: BookingData): number {
  const value = new Date(ride.completedAt || ride.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function formatRideDate(ride: BookingData): string {
  const date = new Date(ride.completedAt || ride.createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRideTime(ride: BookingData): string {
  const date = new Date(ride.completedAt || ride.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const label = status === "ride_completed" ? "Completed" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge
      variant={status === "completed" || status === "ride_completed" ? "default" : "secondary"}
      className={status === "cancelled" ? "bg-red-100 text-red-700" : ""}
    >
      {label}
    </Badge>
  );
}

function LocationRow({
  tone,
  label,
  address,
}: {
  tone: "pickup" | "destination";
  label: string;
  address: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {tone === "pickup" ? (
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
          <div className="h-2 w-2 rounded-full bg-green-600" />
        </div>
      ) : (
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="break-words text-sm font-semibold">{address}</p>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function HistoryEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <Clock className="mx-auto mb-2 h-12 w-12 text-gray-400" />
        <p className="text-gray-600">{message}</p>
      </CardContent>
    </Card>
  );
}
