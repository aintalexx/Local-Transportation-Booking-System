import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  Clock,
  DollarSign,
  Bike,
  AlertCircle,
  CheckCircle2,
  Truck,
  Route,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import { cancelBooking } from "../../utils/bookingDatabase";
import { subscribeToSupabaseBooking, updateSupabaseBookingStatus } from "../../utils/supabaseBookings";
import { subscribeToDriverLocation, type RealtimeDriverLocation } from "../../utils/realtimeTracking";
import { DEMO_DRIVERS, estimateRouteDistanceKm, estimateTravelMinutes, type LatLngPoint } from "../../utils/rideMatching";
import { createRoutePoints, getBookingFlowStatus, isValidRoutePoint } from "../../utils/routeSimulation";
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

export default function OngoingBooking() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activeBooking, refreshBooking, setActiveBooking } = useBooking();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [liveDriverLocation, setLiveDriverLocation] = useState<RealtimeDriverLocation | null>(null);

  const flowStatus = getBookingFlowStatus(activeBooking?.status);
  const routeProgress = getStatusProgress(flowStatus);
  const assignedDriver = activeBooking?.driverUsername
    ? DEMO_DRIVERS.find(driver => driver.username === activeBooking.driverUsername)
    : null;
  const displayDriverLocation = liveDriverLocation || activeBooking?.currentDriverLocation || null;

  const routePoints = useMemo(() => {
    if (!activeBooking) return [];

    if (
      ["driver_found", "driver_to_pickup", "driver_arrived"].includes(flowStatus) &&
      displayDriverLocation
    ) {
      return createRoutePoints(displayDriverLocation, activeBooking.pickupLocation, 24);
    }

    if (["ride_started", "ride_ongoing", "ride_completed"].includes(flowStatus)) {
      return createRoutePoints(activeBooking.pickupLocation, activeBooking.destination, 24);
    }

    return createRoutePoints(activeBooking.pickupLocation, activeBooking.destination, 24);
  }, [activeBooking, displayDriverLocation, flowStatus]);

  const etaToPickup = activeBooking && isValidRoutePoint(displayDriverLocation) && isValidRoutePoint(activeBooking.pickupLocation)
    ? estimateTravelMinutes(
        estimateRouteDistanceKm(displayDriverLocation, activeBooking.pickupLocation),
        assignedDriver?.averageSpeedKph || 18
      )
    : null;
  const tripEta = activeBooking
    ? estimateTravelMinutes(activeBooking.distance, assignedDriver?.averageSpeedKph || 18)
    : null;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!activeBooking) {
      navigate("/passenger");
      return;
    }

    if (flowStatus === "cancelled") {
      toast.info("Booking was cancelled");
      setActiveBooking(null);
      navigate("/passenger");
    }
  }, [user, activeBooking, flowStatus, navigate, setActiveBooking]);

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    setCancelLoading(true);

    try {
      const supabaseBooking = await updateSupabaseBookingStatus(activeBooking.id, "cancelled");
      if (supabaseBooking) {
        toast.success("Booking cancelled");
        setActiveBooking(null);
        navigate("/passenger");
        return;
      }

      const success = cancelBooking(activeBooking.id, cancellationReason);
      if (success) {
        toast.success("Booking cancelled");
        setActiveBooking(null);
        navigate("/passenger");
      } else {
        toast.error("Failed to cancel booking");
      }
    } finally {
      setCancelLoading(false);
      setShowCancelDialog(false);
      setCancellationReason("");
    }
  };

  const handleDone = () => {
    setActiveBooking(null);
    navigate("/passenger");
  };

  useEffect(() => {
    if (!activeBooking?.id) {
      setLiveDriverLocation(null);
      return;
    }

    setLiveDriverLocation(null);
    return subscribeToDriverLocation(activeBooking.id, setLiveDriverLocation);
  }, [activeBooking?.id]);

  useEffect(() => {
    if (!activeBooking?.id) return;

    return subscribeToSupabaseBooking(activeBooking.id, (updatedBooking) => {
      setActiveBooking(updatedBooking);
    });
  }, [activeBooking?.id, setActiveBooking]);

  const getStatusInfo = () => {
    switch (flowStatus) {
      case "finding_driver":
        return {
          text: "Waiting for driver",
          description: "Your booking request is open for online drivers to accept.",
          color: "blue",
          icon: AlertCircle,
        };
      case "driver_found":
        return {
          text: "Driver accepted your booking",
          description: "Preparing the route from driver to pickup",
          color: "green",
          icon: CheckCircle2,
        };
      case "driver_to_pickup":
        return {
          text: "Driver is on the way",
          description: etaToPickup ? `Estimated arrival: ${etaToPickup} mins` : "Driver is heading to your pickup point",
          color: "green",
          icon: Truck,
        };
      case "driver_arrived":
        return {
          text: "Driver has arrived",
          description: "Your driver is at the pickup location",
          color: "purple",
          icon: MapPin,
        };
      case "ride_started":
        return {
          text: "Ride started",
          description: "Starting passenger trip navigation",
          color: "indigo",
          icon: Navigation,
        };
      case "ride_ongoing":
        return {
          text: "Trip in progress",
          description: tripEta ? `Estimated trip time: ${tripEta} mins` : "Enjoy your ride!",
          color: "indigo",
          icon: Navigation,
        };
      case "ride_completed":
        return {
          text: "Booking completed successfully",
          description: "You have arrived at your destination",
          color: "green",
          icon: CheckCircle2,
        };
      default:
        return {
          text: "Processing",
          description: "Please wait...",
          color: "gray",
          icon: Clock,
        };
    }
  };

  if (!activeBooking) {
    return null;
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const statusStyles: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: "border-blue-500", bg: "bg-blue-100", text: "text-blue-600" },
    green: { border: "border-green-500", bg: "bg-green-100", text: "text-green-600" },
    purple: { border: "border-purple-500", bg: "bg-purple-100", text: "text-purple-600" },
    indigo: { border: "border-indigo-500", bg: "bg-indigo-100", text: "text-indigo-600" },
    gray: { border: "border-gray-500", bg: "bg-gray-100", text: "text-gray-600" },
  };
  const statusStyle = statusStyles[statusInfo.color] || statusStyles.gray;
  const canCancel = ["finding_driver", "driver_found", "driver_to_pickup"].includes(flowStatus);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/passenger")}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-bold">
            {flowStatus === "ride_completed" ? "Ride Completed" : "Ongoing Booking"}
          </h1>
        </div>
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => setShowCancelDialog(true)}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          pickup={activeBooking.pickupLocation}
          destination={activeBooking.destination}
          driverLocation={displayDriverLocation}
          routePoints={routePoints}
          height="100%"
          showCurrentLocation={false}
        />

        {/* Status Banner */}
        <div className="absolute top-4 left-4 right-4">
          <Card className={`shadow-lg border-l-4 ${statusStyle.border}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 p-2 rounded-full ${statusStyle.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${statusStyle.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{statusInfo.text}</h3>
                  <p className="text-sm text-gray-600">{statusInfo.description}</p>
                  {flowStatus !== "finding_driver" && flowStatus !== "ride_completed" && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#4B0F14] transition-all"
                        style={{ width: `${routeProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl p-4 max-h-[54vh] overflow-y-auto">
        {flowStatus === "ride_completed" ? (
          <RideCompletedCard
            pickup={activeBooking.pickupLocation}
            destination={activeBooking.destination}
            driverName={activeBooking.driverName || "Assigned Driver"}
            distance={activeBooking.distance}
            duration={tripEta || estimateTravelMinutes(activeBooking.distance)}
            fare={activeBooking.finalPrice}
            onRate={() => navigate(`/rating/${activeBooking.id}`)}
            onDone={handleDone}
            bookingType={activeBooking.bookingType}
            passengerCount={activeBooking.passengerCount}
            totalFare={activeBooking.totalFare}
            individualShare={activeBooking.individualShare}
            splitPaymentEnabled={activeBooking.splitPaymentEnabled}
          />
        ) : (
          <>
            {/* Driver Info */}
            {activeBooking.driverName ? (
              <Card className="mb-4 border-2 border-green-200">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start gap-4">
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarFallback className="bg-green-100 text-green-600 text-xl">
                        {activeBooking.driverName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-bold">{activeBooking.driverName}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{activeBooking.driverVehicleType}</Badge>
                        {activeBooking.driverPlateNumber && (
                          <span className="text-sm text-gray-600">{activeBooking.driverPlateNumber}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                        {assignedDriver && (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500" />
                              {assignedDriver.rating.toFixed(1)}
                            </span>
                            <span>{assignedDriver.completedTrips} trips</span>
                          </>
                        )}
                        {etaToPickup && flowStatus !== "ride_ongoing" && (
                          <span>{etaToPickup} min ETA</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => navigate(`/passenger/chat/${activeBooking.id}`)}
                        aria-label="Open ride chat"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                      {activeBooking.driverPhone && (
                        <a href={`tel:${activeBooking.driverPhone}`}>
                          <Button size="icon" variant="outline" className="rounded-full" aria-label="Call driver">
                            <Phone className="h-5 w-5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {flowStatus === "driver_arrived" && (
                    <div className="rounded-xl bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700">
                      Waiting for the driver to start the trip.
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-4 border-2 border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-blue-100" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Finding your driver...</h3>
                      <p className="text-sm text-gray-600">Your request is visible to online drivers.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trip Details */}
            <TripDetails
              pickup={activeBooking.pickupLocation}
              destination={activeBooking.destination}
              vehicleType={activeBooking.vehicleType}
              distance={activeBooking.distance}
              duration={tripEta || estimateTravelMinutes(activeBooking.distance)}
              fare={activeBooking.finalPrice}
              paymentMethod={activeBooking.paymentMethod}
              discount={activeBooking.discount}
              bookingType={activeBooking.bookingType}
              passengerCount={activeBooking.passengerCount}
              totalFare={activeBooking.totalFare}
              individualShare={activeBooking.individualShare}
              splitPaymentEnabled={activeBooking.splitPaymentEnabled}
            />
          </>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={showCancelDialog}
        onOpenChange={(open) => {
          if (cancelLoading) return;
          setShowCancelDialog(open);
          if (!open) setCancellationReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="ongoingCancelReason" className="text-sm font-medium text-gray-700">
              Cancellation reason <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="ongoingCancelReason"
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value.slice(0, 180))}
              placeholder="Tell us why you are cancelling"
              className="min-h-24 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#4B0F14] focus:bg-white"
              maxLength={180}
            />
            <p className="text-right text-xs text-gray-400">{cancellationReason.length}/180</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading} onClick={() => setCancellationReason("")}>
              No, keep booking
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelLoading}
              onClick={handleCancelBooking}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelLoading ? "Cancelling..." : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TripDetails({
  pickup,
  destination,
  vehicleType,
  distance,
  duration,
  fare,
  paymentMethod,
  discount,
  bookingType,
  passengerCount,
  totalFare,
  individualShare,
  splitPaymentEnabled,
}: {
  pickup: LatLngPoint;
  destination: LatLngPoint;
  vehicleType: string;
  distance: number;
  duration: number;
  fare: number;
  paymentMethod: string;
  discount?: { type: string; amount: number };
  bookingType?: string;
  passengerCount?: number;
  totalFare?: number;
  individualShare?: number;
  splitPaymentEnabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Trip Details</h3>

      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
        <MapPin className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-600">Pickup</p>
          <p className="break-words text-sm font-medium">{pickup.address}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
        <MapPin className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-600">Destination</p>
          <p className="break-words text-sm font-medium">{destination.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoBox icon={<Bike className="h-4 w-4 text-gray-600" />} label="Ride Type" value={bookingType === "group" ? "Group Ride" : "Solo Ride"} />
        <InfoBox icon={<Navigation className="h-4 w-4 text-gray-600" />} label="Passengers" value={`${passengerCount || 1} Pax`} />
        <InfoBox icon={<Clock className="h-4 w-4 text-gray-600" />} label="ETA" value={`${duration} mins`} />
        <InfoBox icon={<DollarSign className="h-4 w-4 text-green-600" />} label="Total Fare" value={`₱${totalFare ?? fare}`} strong />
      </div>

      {splitPaymentEnabled && bookingType === "group" && (
        <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-gray-600 font-medium">Split Payment Enabled</span>
            <span className="font-bold text-[#4B0F14]">₱{individualShare ?? fare} each</span>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-gray-600">Driver Earnings</span>
          <span className="font-bold text-green-600">₱{totalFare ?? fare}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
          <span className="text-gray-600">Payment Method</span>
          <span className="font-semibold">{paymentMethod}</span>
        </div>
        {discount && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
            <span className="text-gray-600">Discount Applied</span>
            <Badge variant="secondary">{discount.type} (-{discount.amount}%)</Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function RideCompletedCard({
  pickup,
  destination,
  driverName,
  distance,
  duration,
  fare,
  onRate,
  onDone,
  bookingType,
  passengerCount,
  totalFare,
  individualShare,
  splitPaymentEnabled,
}: {
  pickup: LatLngPoint;
  destination: LatLngPoint;
  driverName: string;
  distance: number;
  duration: number;
  fare: number;
  onRate: () => void;
  onDone: () => void;
  bookingType?: string;
  passengerCount?: number;
  totalFare?: number;
  individualShare?: number;
  splitPaymentEnabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-green-50 p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">You arrived safely</h2>
        <p className="text-sm text-gray-600">Thank you for riding with Arangkada.</p>
      </div>

      <TripDetails
        pickup={pickup}
        destination={destination}
        vehicleType="Tricycle"
        distance={distance}
        duration={duration}
        fare={fare}
        paymentMethod="Cash"
        bookingType={bookingType}
        passengerCount={passengerCount}
        totalFare={totalFare}
        individualShare={individualShare}
        splitPaymentEnabled={splitPaymentEnabled}
      />

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Route className="h-4 w-4 text-[#4B0F14]" />
          <span>Driver: <strong>{driverName}</strong></span>
        </div>
      </div>

      <Button className="w-full bg-[#4B0F14] hover:bg-[#3a0c10]" onClick={onRate}>
        Rate Driver
      </Button>
      <Button variant="outline" className="w-full" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "min-w-0 rounded-lg bg-green-50 p-3" : "min-w-0 rounded-lg bg-gray-50 p-3"}>
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <p className={strong ? "break-words text-sm font-semibold text-green-600" : "break-words text-sm font-semibold"}>
        {value}
      </p>
    </div>
  );
}

function getStatusProgress(status: ReturnType<typeof getBookingFlowStatus>): number {
  switch (status) {
    case "finding_driver":
      return 8;
    case "driver_found":
      return 18;
    case "driver_to_pickup":
      return 42;
    case "driver_arrived":
      return 55;
    case "ride_started":
      return 68;
    case "ride_ongoing":
      return 82;
    case "ride_completed":
      return 100;
    default:
      return 0;
  }
}
