import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { MapPin, Phone, MessageCircle, AlertCircle, X, Star, Navigation2 } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { toast } from "sonner";

export default function LiveTracking() {
  const navigate = useNavigate();
  const { rideId } = useParams();

  // Mock data - replace with real data from backend
  const ride = {
    id: rideId,
    status: "driver_arriving", // driver_arriving | ride_ongoing | completed
    driver: {
      name: "Pedro Santos",
      phone: "09987654321",
      rating: 4.8,
      totalTrips: 1234,
      photo: null,
      plateNumber: "ABC 1234",
      vehicleType: "Tricycle",
      vehicleColor: "Blue",
    },
    pickup: "PUP Sta. Mesa Campus",
    destination: "SM City Sta. Mesa",
    fare: 25,
    distance: "1.8 km",
    eta: "5 mins",
    driverDistance: "800 m",
    currentLocation: "Approaching pickup point",
  };

  const handleCancelRide = () => {
    toast.info("Use the active booking screen to cancel a live booking.");
    navigate("/passenger/ongoing-booking");
  };

  const handleEmergency = () => {
    toast.info("Opening an emergency call. This demo does not send automated alerts.");
    window.location.href = "tel:911";
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/passenger")}>
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">Live Tracking</h1>
            <Badge
              className={
                ride.status === "driver_arriving"
                  ? "bg-purple-500"
                  : ride.status === "ride_ongoing"
                  ? "bg-green-500"
                  : "bg-gray-500"
              }
            >
              {ride.status === "driver_arriving"
                ? "Driver Arriving"
                : ride.status === "ride_ongoing"
                ? "Ride Ongoing"
                : "Completed"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="bg-gradient-to-br from-[rgba(75,15,20,0.08)] via-purple-100 to-pink-100 relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Navigation2 className="h-16 w-16 text-[#4B0F14] mx-auto mb-3 animate-pulse" />
            <p className="text-gray-700 font-semibold">Live Map Tracking</p>
            <p className="text-sm text-gray-600">Real-time driver location</p>
          </div>
        </div>

        {/* Driver Marker Indicator */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="h-12 w-12 bg-[#4B0F14] rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <Navigation2 className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-12 left-1/2 max-w-[min(12rem,80vw)] -translate-x-1/2 rounded-lg bg-white px-3 py-1 text-center shadow-lg">
              <p className="text-sm font-semibold">{ride.driver.name}</p>
              <p className="text-xs text-gray-600">{ride.driverDistance} away</p>
            </div>
          </div>
        </div>

        {/* Pickup Marker */}
        <div className="absolute bottom-1/3 left-1/4">
          <div className="h-10 w-10 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
          <p className="text-xs bg-white px-2 py-1 rounded mt-1 shadow-sm">Pickup</p>
        </div>

        {/* Destination Marker */}
        <div className="absolute top-1/4 right-1/4">
          <MapPin className="h-10 w-10 text-red-500 filter drop-shadow-lg" />
          <p className="text-xs bg-white px-2 py-1 rounded mt-1 shadow-sm">Destination</p>
        </div>

        {/* ETA Badge */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-white px-4 py-2 rounded-full shadow-lg">
            <p className="text-sm text-gray-600">ETA</p>
            <p className="text-xl font-bold text-[#4B0F14]">{ride.eta}</p>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div className="space-y-4 overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl" style={{ maxHeight: "45vh" }}>
        {/* Driver Info Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={ride.driver.photo || undefined} />
                <AvatarFallback className="text-xl">{ride.driver.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-bold">{ride.driver.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span>{ride.driver.vehicleType}</span>
                  <span>•</span>
                  <span>{ride.driver.plateNumber}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{ride.driver.rating}</span>
                  </div>
                  <span className="text-sm text-gray-600">{ride.driver.totalTrips} trips</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.location.href = `tel:${ride.driver.phone}`}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => navigate(`/passenger/chat/${rideId}`)}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
              <div className="h-3 w-3 rounded-full bg-green-600"></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600">Pickup</p>
              <p className="break-words font-semibold">{ride.pickup}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-8 w-8 text-red-500 flex-shrink-0 mt-1" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600">Destination</p>
              <p className="break-words font-semibold">{ride.destination}</p>
            </div>
          </div>
        </div>

        {/* Fare Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[rgba(75,15,20,0.05)] p-4">
          <div className="min-w-0">
            <p className="text-sm text-gray-600">Total Fare</p>
            <p className="text-2xl font-bold text-[#4B0F14]">₱{ride.fare}</p>
          </div>
          <div className="min-w-0 text-left sm:text-right">
            <p className="text-sm text-gray-600">Distance</p>
            <p className="break-words font-semibold">{ride.distance}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50"
            onClick={handleCancelRide}
            disabled={ride.status === "ride_ongoing"}
          >
            Cancel Ride
          </Button>
          <Button
            variant="outline"
            className="border-orange-500 text-orange-500 hover:bg-orange-50"
            onClick={handleEmergency}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Call 911
          </Button>
        </div>

        {/* Safety Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Your ride is being tracked for safety. Share your trip with family or friends for added security.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
