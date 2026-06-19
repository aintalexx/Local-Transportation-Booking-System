import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  X,
  CheckCircle2,
  Truck,
  DollarSign,
  Clock,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import {
  getDriverBookingHistory,
  updateBookingStatus,
  updateDriverLocation,
  upsertBooking,
  type BookingData,
} from "../../utils/bookingDatabase";
import {
  getSupabaseDriverActiveBooking,
  subscribeToSupabaseBooking,
  updateSupabaseDriverBookingStatus,
} from "../../utils/supabaseBookings";
import { publishDriverLocation } from "../../utils/realtimeTracking";
import { createRoutePoints, getBookingFlowStatus } from "../../utils/routeSimulation";
import { estimateRouteDistanceKm, estimateTravelMinutes } from "../../utils/rideMatching";
import MapView from "../../components/MapView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

type CompletedTripSummary = {
  passengerName: string;
  fare: number;
  distance: number;
  paymentMethod: string;
  completedAt: string;
  tripsCompleted: number;
  bookingType?: string;
  passengerCount?: number;
  splitPaymentEnabled?: boolean;
  individualShare?: number;
};

type DriverNextStatus = "driver_arriving" | "passenger_picked_up" | "in_progress";

export default function ActiveRide() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activeBooking, refreshBooking, setActiveBooking } = useBooking();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [completedTrip, setCompletedTrip] = useState<CompletedTripSummary | null>(null);

  const flowStatus = getBookingFlowStatus(activeBooking?.status);
  const displayDriverLocation = activeBooking?.currentDriverLocation || driverLocation;
  const routePoints = useMemo(() => {
    if (!activeBooking) return [];

    if (["driver_found", "driver_to_pickup", "driver_arrived"].includes(flowStatus) && displayDriverLocation) {
      return createRoutePoints(displayDriverLocation, activeBooking.pickupLocation, 24);
    }

    return createRoutePoints(activeBooking.pickupLocation, activeBooking.destination, 24);
  }, [activeBooking, displayDriverLocation, flowStatus]);
  const etaToPickup = activeBooking && displayDriverLocation
    ? estimateTravelMinutes(estimateRouteDistanceKm(displayDriverLocation, activeBooking.pickupLocation), 18)
    : null;
  const tripEta = activeBooking ? estimateTravelMinutes(activeBooking.distance, 18) : null;

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const loadAssignedBooking = async () => {
      if (activeBooking || completedTrip) {
        setLoadingBooking(false);
        return;
      }

      setLoadingBooking(true);
      const assignedBooking = await getSupabaseDriverActiveBooking(user);
      if (cancelled) return;

      if (assignedBooking) {
        setActiveBooking(assignedBooking);
        upsertBooking(assignedBooking);
        setLoadingBooking(false);
        return;
      }

      setLoadingBooking(false);
      navigate("/driver", { replace: true });
    };

    void loadAssignedBooking();

    return () => {
      cancelled = true;
    };
  }, [activeBooking, completedTrip, navigate, setActiveBooking, user]);

  useEffect(() => {
    if (!activeBooking?.id) return;

    return subscribeToSupabaseBooking(activeBooking.id, (updatedBooking) => {
      upsertBooking(updatedBooking);
      setActiveBooking(updatedBooking);
      if (updatedBooking.status === "completed" || updatedBooking.status === "ride_completed") {
        setCompletedTrip(createCompletedTripSummary(updatedBooking, user?.username, user?.supabaseId));
        setActiveBooking(null);
      }
    });
  }, [activeBooking?.id, setActiveBooking, user?.supabaseId, user?.username]);

  useEffect(() => {
    if (!user || !activeBooking) return;

    const updateLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });

          if (!activeBooking.id.includes("-")) {
            updateDriverLocation(activeBooking.id, latitude, longitude);
          }

          void publishDriverLocation({
            bookingId: activeBooking.id,
            driverUsername: user.username,
            lat: latitude,
            lng: longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
          });
        },
        (error) => {
          console.info("Could not get driver location:", error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    };

    updateLocation();
    const interval = window.setInterval(updateLocation, 5000);

    return () => window.clearInterval(interval);
  }, [user, activeBooking]);

  const handleStatusUpdate = async (newStatus: DriverNextStatus) => {
    if (!activeBooking || !user) return;

    const supabaseBooking = await updateSupabaseDriverBookingStatus(activeBooking.id, newStatus, user);
    if (supabaseBooking) {
      upsertBooking(supabaseBooking);
      setActiveBooking(supabaseBooking);
      refreshBooking();
      toast.success(getStatusMessage(newStatus));
      return;
    }

    const success = updateBookingStatus(activeBooking.id, newStatus);
    if (success) {
      setActiveBooking({ ...activeBooking, status: newStatus });
      refreshBooking();
      toast.success(getStatusMessage(newStatus));
      return;
    }

    toast.error("Failed to update booking status.");
  };

  const handleCompleteRide = async () => {
    if (!activeBooking || !user) return;

    const supabaseBooking = await updateSupabaseDriverBookingStatus(activeBooking.id, "completed", user);
    if (supabaseBooking) {
      upsertBooking(supabaseBooking);
      setCompletedTrip(createCompletedTripSummary(supabaseBooking, user.username, user.supabaseId));
      setShowCompleteDialog(false);
      setActiveBooking(null);
      return;
    }

    const success = updateBookingStatus(activeBooking.id, "completed");
    if (success) {
      setCompletedTrip(createCompletedTripSummary(
        { ...activeBooking, status: "completed", completedAt: new Date().toISOString() },
        user.username,
        user.supabaseId
      ));
      setShowCompleteDialog(false);
      setActiveBooking(null);
    } else {
      toast.error("Failed to complete trip");
    }
  };

  if (completedTrip) {
    return (
      <CompletedTripResult
        summary={completedTrip}
        onViewSummary={() => {
          setCompletedTrip(null);
          navigate("/driver/history");
        }}
        onReturnHome={() => {
          setCompletedTrip(null);
          navigate("/driver");
        }}
      />
    );
  }

  if (loadingBooking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#4B0F14]" />
          <p className="font-semibold text-[#4B0F14]">Loading active booking...</p>
        </div>
      </div>
    );
  }

  if (!activeBooking) {
    return null;
  }

  const statusInfo = getDriverStatusInfo(activeBooking.status, etaToPickup, tripEta);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex h-screen min-h-0 flex-col bg-gray-50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/driver")}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-bold">Active Ride</h1>
        </div>
        <Badge className={`${statusInfo.color} text-white`}>{statusInfo.label}</Badge>
      </div>

      <div className="relative min-h-0 flex-1">
        <MapView
          pickup={activeBooking.pickupLocation}
          destination={activeBooking.destination}
          driverLocation={displayDriverLocation}
          routePoints={routePoints}
          height="100%"
          showCurrentLocation={false}
        />

        <div className="absolute left-4 right-4 top-4">
          <Card className="border-l-4 border-l-[#4B0F14] shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[rgba(75,15,20,0.08)] p-2 text-[#4B0F14]">
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900">{statusInfo.title}</h3>
                  <p className="text-sm text-gray-600">{statusInfo.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-h-[56vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl">
        <Card className="mb-4 border-2 border-[rgba(75,15,20,0.2)]">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-[rgba(75,15,20,0.08)] text-xl text-[#4B0F14]">
                  {(activeBooking.passengerName || "Passenger").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-bold">{activeBooking.passengerName || "Passenger"}</h3>
                <p className="break-words text-sm text-gray-600">{activeBooking.passengerPhone || "N/A"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => navigate(`/driver/chat/${activeBooking.id}`)}
                  aria-label="Open ride chat"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                {activeBooking.passengerPhone && (
                  <a href={`tel:${activeBooking.passengerPhone}`}>
                    <Button size="icon" variant="outline" className="rounded-full" aria-label="Call passenger">
                      <Phone className="h-5 w-5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 space-y-3">
          <LocationRow label="Pickup Location" value={activeBooking.pickupLocation.address} color="green" />
          <LocationRow label="Destination" value={activeBooking.destination.address} color="red" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <InfoBox label="Distance" value={`${activeBooking.distance.toFixed(1)} km`} />
            <InfoBox label="Pickup ETA" value={etaToPickup ? `${etaToPickup} min` : "Tracking"} />
            <InfoBox label="Trip ETA" value={tripEta ? `${tripEta} min` : "Calculating"} />
            <InfoBox label="Driver Earnings" value={`PHP ${activeBooking.totalFare ?? activeBooking.finalPrice}`} strong />
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-semibold">{activeBooking.paymentMethod}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
              <span className="text-gray-600">Ride Type</span>
              <span className="font-semibold">
                {activeBooking.bookingType === "group" ? `Group Ride (${activeBooking.passengerCount || 2} Pax)` : "Solo Ride"}
              </span>
            </div>
            {activeBooking.splitPaymentEnabled && activeBooking.bookingType === "group" && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm text-red-600 font-semibold">
                <span>Split Payment Enabled</span>
                <span>PHP {activeBooking.individualShare} each</span>
              </div>
            )}
          </div>
        </div>

        {getActionButton(activeBooking.status, handleStatusUpdate, () => setShowCompleteDialog(true))}
      </div>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have arrived at the destination and the passenger has been dropped off.
              You will earn PHP {activeBooking.totalFare ?? activeBooking.finalPrice} for this trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteRide}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getActionButton(
  status: BookingData["status"],
  onStatusUpdate: (status: DriverNextStatus) => void,
  onComplete: () => void
) {
  switch (status) {
    case "accepted":
    case "driver_found":
      return (
        <Button className="w-full whitespace-normal bg-[#4B0F14] hover:bg-[#6E171D]" size="lg" onClick={() => onStatusUpdate("driver_arriving")}>
          <Truck className="mr-2 h-5 w-5" />
          Start Driving to Pickup
        </Button>
      );
    case "driver_arriving":
    case "en_route":
      return (
        <Button className="w-full whitespace-normal bg-green-600 hover:bg-green-700" size="lg" onClick={() => onStatusUpdate("passenger_picked_up")}>
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Passenger Picked Up
        </Button>
      );
    case "passenger_picked_up":
    case "arrived":
      return (
        <Button className="w-full whitespace-normal bg-purple-600 hover:bg-purple-700" size="lg" onClick={() => onStatusUpdate("in_progress")}>
          <Navigation className="mr-2 h-5 w-5" />
          Start Trip
        </Button>
      );
    case "in_progress":
      return (
        <Button className="w-full whitespace-normal bg-orange-600 hover:bg-orange-700" size="lg" onClick={onComplete}>
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Complete Trip
        </Button>
      );
    default:
      return null;
  }
}

function getStatusMessage(status: DriverNextStatus): string {
  const messages: Record<DriverNextStatus, string> = {
    driver_arriving: "Status updated: Driving to pickup",
    passenger_picked_up: "Passenger pickup confirmed",
    in_progress: "Trip started!",
  };
  return messages[status];
}

function getDriverStatusInfo(status: BookingData["status"], etaToPickup: number | null, tripEta: number | null) {
  switch (status) {
    case "accepted":
    case "driver_found":
      return {
        label: "Accepted",
        title: "Booking accepted",
        description: "Review the pickup route and start driving when ready.",
        color: "bg-[#4B0F14]",
        icon: CheckCircle2,
      };
    case "driver_arriving":
    case "en_route":
      return {
        label: "To Pickup",
        title: "Heading to passenger",
        description: etaToPickup ? `Estimated pickup arrival: ${etaToPickup} minutes.` : "Proceed to the pickup point.",
        color: "bg-green-500",
        icon: Truck,
      };
    case "passenger_picked_up":
    case "arrived":
      return {
        label: "Picked Up",
        title: "Passenger picked up",
        description: "Start the trip when you are ready to go to the destination.",
        color: "bg-purple-500",
        icon: MapPin,
      };
    case "in_progress":
      return {
        label: "In Progress",
        title: "Trip in progress",
        description: tripEta ? `Estimated trip time: ${tripEta} minutes.` : "Navigate to the passenger destination.",
        color: "bg-orange-500",
        icon: Navigation,
      };
    default:
      return {
        label: "Active",
        title: "Active booking",
        description: "Booking details are being synchronized.",
        color: "bg-gray-500",
        icon: Clock,
      };
  }
}

function LocationRow({ label, value, color }: { label: string; value: string; color: "green" | "red" }) {
  const colorClass = color === "green" ? "text-green-600 bg-green-50 border-green-200" : "text-red-600 bg-red-50 border-red-200";
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${colorClass}`}>
      <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-600">{label}</p>
        <p className="break-words text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function InfoBox({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "min-w-0 rounded-lg bg-green-50 p-3" : "min-w-0 rounded-lg bg-gray-50 p-3"}>
      <div className="mb-1 flex items-center gap-2">
        {strong ? <DollarSign className="h-4 w-4 text-green-600" /> : <Route className="h-4 w-4 text-gray-600" />}
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <p className={strong ? "break-words text-sm font-semibold text-green-600" : "break-words text-sm font-semibold"}>
        {value}
      </p>
    </div>
  );
}

function CompletedTripResult({
  summary,
  onViewSummary,
  onReturnHome,
}: {
  summary: CompletedTripSummary;
  onViewSummary: () => void;
  onReturnHome: () => void;
}) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[#343C56] px-4 pt-10">
      <div className="w-full max-w-sm rounded-md bg-white px-5 py-6 text-center shadow-2xl">
        <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full border border-gray-100 px-5 py-2 shadow-sm">
          <span className="text-sm font-black text-[#D4AF37]">PHP</span>
          <span className="text-2xl font-black text-[#1F2937]">{summary.fare.toFixed(2)}</span>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {formatCompletedDate(summary.completedAt)}
        </p>

        <div className="my-5 h-px bg-gray-100" />

        <p className="text-base font-semibold text-[#1F2937]">Trip Completed</p>
        <p className="mt-1 text-sm text-gray-500">Passenger: {summary.passengerName}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Distance</p>
            <p className="mt-1 font-bold text-gray-900">{summary.distance.toFixed(1)} km</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Payment</p>
            <p className="mt-1 font-bold text-gray-900">{summary.paymentMethod}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Ride Type</p>
            <p className="mt-1 font-bold text-gray-900">{summary.bookingType === "group" ? `Group (${summary.passengerCount || 2} Pax)` : "Solo"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Split Share</p>
            <p className="mt-1 font-bold text-gray-900">{summary.splitPaymentEnabled && summary.bookingType === "group" ? `₱${summary.individualShare} each` : "Disabled"}</p>
          </div>
        </div>

        <p className="mt-5 text-sm font-semibold text-gray-700">
          {summary.tripsCompleted.toString().padStart(2, "0")} Trips Completed
        </p>

        <button
          onClick={onViewSummary}
          className="mt-5 h-11 w-full rounded-full border border-[#D4AF37] text-sm font-bold uppercase text-[#D4AF37] transition hover:bg-[#FFF8E8]"
        >
          View Summary
        </button>
        <button
          onClick={onReturnHome}
          className="mt-3 h-11 w-full rounded-full bg-[#4B0F14] text-sm font-bold uppercase text-white transition hover:bg-[#6E171D]"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}

function createCompletedTripSummary(
  booking: BookingData,
  driverUsername?: string,
  driverSupabaseId?: string
): CompletedTripSummary {
  const completedLocalTrips = driverUsername
    ? getDriverBookingHistory(driverUsername, driverSupabaseId).filter(
        (trip) => trip.status === "completed" || trip.status === "ride_completed"
      ).length
    : 0;

  return {
    passengerName: booking.passengerName || "Passenger",
    fare: booking.totalFare ?? booking.finalPrice,
    distance: booking.distance,
    paymentMethod: booking.paymentMethod,
    completedAt: booking.completedAt || new Date().toISOString(),
    tripsCompleted: Math.max(1, completedLocalTrips),
    bookingType: booking.bookingType,
    passengerCount: booking.passengerCount,
    splitPaymentEnabled: booking.splitPaymentEnabled,
    individualShare: booking.individualShare,
  };
}

function formatCompletedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
