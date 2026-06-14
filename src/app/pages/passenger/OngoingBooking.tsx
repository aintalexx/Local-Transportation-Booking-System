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
  Clock,
  DollarSign,
  Bike,
  AlertCircle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import { cancelBooking } from "../../utils/bookingDatabase";
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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!activeBooking) {
      navigate("/passenger");
      return;
    }

    // Redirect if booking is completed or cancelled
    if (activeBooking.status === "completed") {
      toast.success("Ride completed! Thank you for using Arangkada.");
      setActiveBooking(null);
      navigate("/passenger");
    } else if (activeBooking.status === "cancelled") {
      toast.info("Booking was cancelled");
      setActiveBooking(null);
      navigate("/passenger");
    }
  }, [user, activeBooking, navigate, setActiveBooking]);

  const handleCancelBooking = () => {
    if (!activeBooking) return;

    const success = cancelBooking(activeBooking.id);
    if (success) {
      toast.success("Booking cancelled");
      setActiveBooking(null);
      navigate("/passenger");
    } else {
      toast.error("Failed to cancel booking");
    }
  };

  const getStatusInfo = () => {
    if (!activeBooking) return { text: "Loading...", color: "gray", icon: Clock };

    switch (activeBooking.status) {
      case "pending":
        return {
          text: "Searching for driver",
          description: "We're finding the nearest available driver for you...",
          color: "blue",
          icon: AlertCircle,
        };
      case "accepted":
        return {
          text: "Driver accepted",
          description: "Your driver is on the way to pick you up",
          color: "green",
          icon: CheckCircle2,
        };
      case "en_route":
        return {
          text: "Driver en route",
          description: "Your driver is heading to your pickup location",
          color: "green",
          icon: Truck,
        };
      case "arrived":
        return {
          text: "Driver arrived",
          description: "Your driver has arrived at the pickup location",
          color: "purple",
          icon: MapPin,
        };
      case "in_progress":
        return {
          text: "Trip in progress",
          description: "Enjoy your ride!",
          color: "indigo",
          icon: Navigation,
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/passenger")}>
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Ongoing Booking</h1>
        </div>
        {activeBooking.status === "pending" && (
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
          driverLocation={activeBooking.currentDriverLocation}
          height="100%"
          showCurrentLocation={false}
        />

        {/* Status Banner */}
        <div className="absolute top-4 left-4 right-4">
          <Card className={`shadow-lg border-l-4 border-${statusInfo.color}-500`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-${statusInfo.color}-100`}>
                  <StatusIcon className={`h-5 w-5 text-${statusInfo.color}-600`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{statusInfo.text}</h3>
                  <p className="text-sm text-gray-600">{statusInfo.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl p-4 max-h-[50vh] overflow-y-auto">
        {/* Driver Info (when assigned) */}
        {activeBooking.driverName && (
          <Card className="mb-4 border-2 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 mb-3">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-green-100 text-green-600 text-xl">
                    {activeBooking.driverName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{activeBooking.driverName}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{activeBooking.driverVehicleType}</Badge>
                    {activeBooking.driverPlateNumber && (
                      <span className="text-sm text-gray-600">{activeBooking.driverPlateNumber}</span>
                    )}
                  </div>
                </div>
                <a href={`tel:${activeBooking.driverPhone}`}>
                  <Button size="icon" variant="outline" className="rounded-full">
                    <Phone className="h-5 w-5" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Trip Details</h3>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Pickup</p>
              <p className="font-medium text-sm">{activeBooking.pickupLocation.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Destination</p>
              <p className="font-medium text-sm">{activeBooking.destination.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Bike className="h-4 w-4 text-gray-600" />
                <p className="text-xs text-gray-600">Vehicle</p>
              </div>
              <p className="font-semibold text-sm">{activeBooking.vehicleType}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="h-4 w-4 text-gray-600" />
                <p className="text-xs text-gray-600">Distance</p>
              </div>
              <p className="font-semibold text-sm">{activeBooking.distance.toFixed(1)} km</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <p className="text-xs text-gray-600">Fare</p>
              </div>
              <p className="font-semibold text-sm text-green-600">₱{activeBooking.finalPrice}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-semibold">{activeBooking.paymentMethod}</span>
            </div>
            {activeBooking.discount && (
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                <span className="text-gray-600">Discount Applied</span>
                <Badge variant="secondary">{activeBooking.discount.type} (-{activeBooking.discount.amount}%)</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
