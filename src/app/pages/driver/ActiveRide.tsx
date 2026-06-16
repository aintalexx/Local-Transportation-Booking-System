import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  MapPin,
  Navigation,
  Phone,
  X,
  CheckCircle2,
  Truck,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import { updateBookingStatus, updateDriverLocation } from "../../utils/bookingDatabase";
import { updateSupabaseBookingStatus } from "../../utils/supabaseBookings";
import { publishDriverLocation } from "../../utils/realtimeTracking";
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

export default function ActiveRide() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activeBooking, refreshBooking, setActiveBooking } = useBooking();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!activeBooking) {
      navigate("/driver");
      return;
    }

    // Get driver's current location and update periodically
    const updateLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ lat: latitude, lng: longitude });

          // Update driver location in booking
          if (activeBooking) {
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
            refreshBooking();
          }
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

    // Update location immediately and then every 5 seconds
    updateLocation();
    const interval = setInterval(updateLocation, 5000);

    return () => clearInterval(interval);
  }, [user, activeBooking, navigate, refreshBooking]);

  const handleStatusUpdate = async (newStatus: "en_route" | "arrived" | "in_progress") => {
    if (!activeBooking) return;

    const supabaseBooking = await updateSupabaseBookingStatus(activeBooking.id, newStatus);
    if (supabaseBooking) {
      setActiveBooking(supabaseBooking);
      refreshBooking();
      const messages = {
        en_route: "Status updated: En route to pickup",
        arrived: "Status updated: Arrived at pickup",
        in_progress: "Trip started!",
      };
      toast.success(messages[newStatus]);
      return;
    }

    const success = updateBookingStatus(activeBooking.id, newStatus);
    if (success) {
      refreshBooking();
      const messages = {
        en_route: "Status updated: En route to pickup",
        arrived: "Status updated: Arrived at pickup",
        in_progress: "Trip started!",
      };
      toast.success(messages[newStatus]);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeBooking) return;

    const supabaseBooking = await updateSupabaseBookingStatus(activeBooking.id, "completed");
    if (supabaseBooking) {
      toast.success(`Trip completed! You earned â‚±${activeBooking.finalPrice}`);
      setActiveBooking(null);
      navigate("/driver");
      return;
    }

    const success = updateBookingStatus(activeBooking.id, "completed");
    if (success) {
      toast.success(`Trip completed! You earned ₱${activeBooking.finalPrice}`);
      setActiveBooking(null);
      navigate("/driver");
    } else {
      toast.error("Failed to complete trip");
    }
  };

  if (!activeBooking) {
    return null;
  }

  const getActionButton = () => {
    switch (activeBooking.status) {
      case "accepted":
        return (
          <Button
            className="w-full whitespace-normal bg-[#4B0F14] hover:bg-[#6E171D]"
            size="lg"
            onClick={() => handleStatusUpdate("en_route")}
          >
            <Truck className="h-5 w-5 mr-2" />
            Start Driving to Pickup
          </Button>
        );
      case "en_route":
        return (
          <Button
            className="w-full whitespace-normal bg-green-600 hover:bg-green-700"
            size="lg"
            onClick={() => handleStatusUpdate("arrived")}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            I've Arrived at Pickup
          </Button>
        );
      case "arrived":
        return (
          <Button
            className="w-full whitespace-normal bg-purple-600 hover:bg-purple-700"
            size="lg"
            onClick={() => handleStatusUpdate("in_progress")}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Start Trip
          </Button>
        );
      case "in_progress":
        return (
          <Button
            className="w-full whitespace-normal bg-orange-600 hover:bg-orange-700"
            size="lg"
            onClick={() => setShowCompleteDialog(true)}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Complete Trip
          </Button>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    const statusMap = {
      accepted: { text: "Accepted", color: "bg-[#4B0F14]" },
      en_route: { text: "En Route", color: "bg-green-500" },
      arrived: { text: "Arrived", color: "bg-purple-500" },
      in_progress: { text: "In Progress", color: "bg-orange-500" },
    };

    const status = statusMap[activeBooking.status as keyof typeof statusMap];
    return (
      <Badge className={`${status?.color || "bg-gray-500"} text-white`}>
        {status?.text || "Unknown"}
      </Badge>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/driver")}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-bold">Active Ride</h1>
        </div>
        {getStatusBadge()}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          pickup={activeBooking.pickupLocation}
          destination={activeBooking.destination}
          driverLocation={activeBooking.currentDriverLocation || driverLocation}
          height="100%"
          showCurrentLocation={false}
        />
      </div>

      {/* Bottom Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl p-4 max-h-[50vh] overflow-y-auto">
        {/* Passenger Info */}
        <Card className="mb-4 border-2 border-[rgba(75,15,20,0.2)]">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-[rgba(75,15,20,0.08)] text-[#4B0F14] text-xl">
                  {activeBooking.passengerName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-bold">{activeBooking.passengerName}</h3>
                <p className="break-words text-sm text-gray-600">{activeBooking.passengerPhone}</p>
              </div>
              <a className="shrink-0" href={`tel:${activeBooking.passengerPhone}`}>
                <Button size="icon" variant="outline" className="rounded-full">
                  <Phone className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600">Pickup Location</p>
              <p className="break-words text-sm font-medium">{activeBooking.pickupLocation.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600">Destination</p>
              <p className="break-words text-sm font-medium">{activeBooking.destination.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Distance</p>
              <p className="break-words text-sm font-semibold">{activeBooking.distance.toFixed(1)} km</p>
            </div>
            <div className="min-w-0 rounded-lg bg-green-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 shrink-0 text-green-600" />
                <p className="text-xs text-gray-600">Fare</p>
              </div>
              <p className="break-words text-lg font-semibold text-green-600">₱{activeBooking.finalPrice}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-semibold">{activeBooking.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {getActionButton()}
      </div>

      {/* Complete Trip Confirmation */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have arrived at the destination and the passenger has been dropped off.
              You will earn ₱{activeBooking.finalPrice} for this trip.
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
