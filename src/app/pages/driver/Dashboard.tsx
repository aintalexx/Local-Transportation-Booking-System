import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { MapPin, DollarSign, Clock, TrendingUp, Navigation2, Phone, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import { getPendingBookings, acceptBooking, getDriverActiveBooking } from "../../utils/bookingDatabase";
import { dedupePendingBookings } from "../../utils/bookingDeduplication";
import {
  acceptSupabaseBooking,
  getSupabaseDriverActiveBooking,
  getSupabasePendingBookings,
} from "../../utils/supabaseBookings";
import { setDriverOnlineStatus, syncSupabaseProfile } from "../../utils/supabaseProfiles";
import { formatPersonName } from "../../utils/nameFormatting";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const { activeBooking, setActiveBooking, refreshBooking } = useBooking();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);

  // Check for active booking on mount
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const checkActiveBooking = async () => {
      await syncSupabaseProfile(currentUser);
      const driverActiveBooking = await getSupabaseDriverActiveBooking(currentUser) || getDriverActiveBooking(currentUser.username);
      if (driverActiveBooking) {
        setActiveBooking(driverActiveBooking);
        navigate("/driver/active-ride");
      }
    };

    void checkActiveBooking();
  }, [currentUser, navigate, setActiveBooking]);

  // Load pending bookings
  useEffect(() => {
    if (!isOnline || !currentUser) {
      setPendingBookings([]);
      return;
    }

    const loadBookings = async () => {
      const supabaseBookings = await getSupabasePendingBookings(currentUser.vehicleType || "Tricycle");
      const localBookings = getPendingBookings(currentUser.vehicleType?.toLowerCase());
      setPendingBookings(dedupePendingBookings([...supabaseBookings, ...localBookings]));
    };

    void loadBookings();
    const interval = setInterval(() => {
      void loadBookings();
    }, 2500);

    return () => clearInterval(interval);
  }, [isOnline, currentUser, activeBooking]);

  const driver = {
    name: currentUser ? formatPersonName(currentUser, "Driver") : "Driver",
    vehicleType: currentUser?.vehicleType || "Tricycle",
    plateNumber: currentUser?.plateNumber || "ABC 1234",
    rating: currentUser?.rating || 4.8,
    totalTrips: currentUser?.totalTrips || 0,
  };

  const todayStats = {
    earnings: 850,
    trips: 12,
    hours: 6.5,
    avgRating: 4.9,
  };

  const handleToggleOnline = (checked: boolean) => {
    setIsOnline(checked);
    if (currentUser) void setDriverOnlineStatus(currentUser, checked);
    toast.success(checked ? "You are now online" : "You are now offline");
  };

  const handleAcceptRequest = async (bookingId: string) => {
    if (!currentUser) return;

    const supabaseBooking = await acceptSupabaseBooking(bookingId, currentUser);
    if (supabaseBooking) {
      setActiveBooking(supabaseBooking);
      toast.success("Ride accepted! Navigate to pickup location.");
      refreshBooking();
      navigate("/driver/active-ride");
      return;
    }

    const driverName = formatPersonName(currentUser, currentUser.username);
    const success = acceptBooking(
      bookingId,
      currentUser.username,
      driverName,
      currentUser.phoneNumber,
      currentUser.vehicleType || "Tricycle",
      currentUser.plateNumber || ""
    );

    if (success) {
      const acceptedBooking = getDriverActiveBooking(currentUser.username);
      if (acceptedBooking) setActiveBooking(acceptedBooking);
      toast.success("Ride accepted! Navigate to pickup location.");
      refreshBooking();
      navigate("/driver/active-ride");
    } else {
      toast.error("Failed to accept booking. It may have been taken by another driver.");
    }
  };

  const handleRejectRequest = (bookingId: string) => {
    setPendingBookings(pendingBookings.filter(b => b.id !== bookingId));
    toast.info("Ride request declined");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6 safe-top animate-slide-down shadow-lg">
        <div className="max-w-screen-md mx-auto">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold">Driver Dashboard</h1>
              <p className="break-words text-[#FFF8E7]/80">Welcome, {driver.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3 backdrop-ios rounded-xl p-3 shadow-sm border border-white/20">
              <span className="text-sm font-semibold">{isOnline ? "Online" : "Offline"}</span>
              <Switch
                checked={isOnline}
                onCheckedChange={handleToggleOnline}
                className="data-[state=checked]:bg-[#D4AF37]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-white/25 backdrop-blur text-white border-white/30 px-3 py-1">
              {driver.vehicleType}
            </Badge>
            {driver.plateNumber && (
              <Badge variant="secondary" className="bg-white/25 backdrop-blur text-white border-white/30 px-3 py-1">
                {driver.plateNumber}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4 pb-24 safe-bottom">
        {/* Online Status Alert */}
        {!isOnline && (
          <Alert className="mb-4 border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-sm animate-slide-down">
            <AlertDescription className="text-orange-800 font-medium">
              You're currently offline. Turn online to receive ride requests.
            </AlertDescription>
          </Alert>
        )}

        {/* Incoming Ride Requests */}
        {pendingBookings.length > 0 && isOnline && (
          <div className="mb-4 space-y-3 animate-scale-in">
            <h2 className="text-lg font-bold text-gray-900">Incoming Ride Requests</h2>
            {pendingBookings.map((booking) => (
              <Card key={booking.id} className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-smooth animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="shrink-0">
                        <AvatarFallback>{booking.passengerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="break-words text-lg">{booking.passengerName}</CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          {booking.passengerPhone}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge className="bg-green-500">{booking.vehicleType}</Badge>
                      <Badge className={booking.rideType === "group" ? "bg-amber-600" : "bg-blue-600"}>
                        {booking.rideType === "group" ? "GROUP" : "SOLO"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <div className="h-2 w-2 rounded-full bg-green-600"></div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600">Pickup</p>
                        <p className="break-words font-semibold">{booking.pickupLocation.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600">Destination</p>
                        <p className="break-words font-semibold">{booking.destination.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Solo/Group Helper Notes */}
                  <div className="p-3 rounded-lg text-xs border border-gray-100" style={{ background: "#fcfcfc" }}>
                    {booking.rideType === "group" ? (
                      <p style={{ color: "#b45309" }} className="leading-relaxed">
                        <span className="font-bold">Group Ride:</span> Traveling with companions. Number of companions: {booking.passengerCount || 1}. Do not match other passengers.
                      </p>
                    ) : (
                      <p style={{ color: "#1e3a8a" }} className="leading-relaxed">
                        <span className="font-bold">Solo Ride:</span> Exclusive tricycle service, no companions allowed.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600">Distance</p>
                      <p className="break-words font-semibold">{booking.distance.toFixed(1)} km</p>
                    </div>
                    {booking.rideType === "group" && (
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600">Passengers</p>
                        <p className="break-words font-semibold">{booking.reserveEntire ? "5 (Reserved)" : (booking.passengerCount || 1)}</p>
                      </div>
                    )}
                    <div className="min-w-0 text-left sm:text-right">
                      <p className="text-sm text-gray-600">Fare</p>
                      <p className="break-words text-xl font-bold text-green-600">₱{booking.finalPrice}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="border-2 border-red-400 text-red-600 hover:bg-red-50 active:bg-red-100 font-semibold h-12 touch-active transition-smooth"
                      onClick={() => handleRejectRequest(booking.id)}
                    >
                      Decline
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md font-semibold h-12 touch-active transition-smooth"
                      onClick={() => handleAcceptRequest(booking.id)}
                    >
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Requests Message */}
        {pendingBookings.length === 0 && isOnline && (
          <Card className="mb-4 animate-fade-in shadow-sm">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="h-20 w-20 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse-slow">
                <Navigation2 className="h-10 w-10 text-[#4B0F14]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Looking for passengers...</h3>
              <p className="text-gray-600 text-sm">You'll receive notifications when passengers request a ride</p>
            </CardContent>
          </Card>
        )}

        {/* Today's Earnings */}
        <Card className="mb-4 shadow-sm animate-scale-in">
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
            <CardDescription>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 shadow-sm touch-active">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">Earnings</p>
                </div>
                <p className="break-words text-2xl font-bold text-green-700">₱{todayStats.earnings}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-[rgba(75,15,20,0.04)] to-[rgba(75,15,20,0.08)] rounded-2xl border-2 border-[rgba(75,15,20,0.2)] shadow-sm touch-active">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-[#4B0F14] rounded-lg flex items-center justify-center">
                    <Navigation2 className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">Trips</p>
                </div>
                <p className="text-2xl font-bold text-[#4B0F14]">{todayStats.trips}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 shadow-sm touch-active">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">Hours</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">{todayStats.hours}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border-2 border-yellow-200 shadow-sm touch-active">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">Rating</p>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{todayStats.avgRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Stats */}
        <Card className="shadow-sm animate-scale-in">
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
            <CardDescription>Overall statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-gray-600">Total Trips</span>
              <span className="font-bold">{driver.totalTrips}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-bold flex items-center gap-1">
                <span className="text-yellow-600">★</span>
                {driver.rating}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-gray-600">Vehicle Type</span>
              <span className="break-words text-right font-bold">{driver.vehicleType}</span>
            </div>
            {driver.plateNumber && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-600">Plate Number</span>
                <span className="break-words text-right font-bold">{driver.plateNumber}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
