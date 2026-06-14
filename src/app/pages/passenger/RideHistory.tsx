import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { MapPin, Clock, Star, Calendar } from "lucide-react";

export default function RideHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const rides = [
    {
      id: "1",
      date: "2026-06-06",
      time: "14:30",
      pickup: "PUP Sta. Mesa",
      destination: "Divisoria",
      fare: 65,
      driver: "Maria Garcia",
      vehicleType: "Tricycle",
      plateNumber: "ABC 123",
      status: "completed",
      rating: 5,
    },
    {
      id: "2",
      date: "2026-06-05",
      time: "08:15",
      pickup: "San Juan",
      destination: "PUP Sta. Mesa",
      fare: 40,
      driver: "Jose Reyes",
      vehicleType: "E-Bike",
      plateNumber: "XYZ 456",
      status: "completed",
      rating: 4,
    },
    {
      id: "3",
      date: "2026-06-04",
      time: "16:45",
      pickup: "PUP Sta. Mesa",
      destination: "V. Mapa Station",
      fare: 35,
      driver: "Ana Santos",
      vehicleType: "Tricycle",
      plateNumber: "DEF 789",
      status: "completed",
      rating: 5,
    },
    {
      id: "4",
      date: "2026-06-03",
      time: "12:00",
      pickup: "Divisoria",
      destination: "Sta. Mesa Market",
      fare: 50,
      driver: "Carlos Mendoza",
      vehicleType: "E-Bike",
      plateNumber: "GHI 321",
      status: "cancelled",
      rating: 0,
    },
  ];

  const filteredRides = rides.filter(ride => {
    if (filter === "all") return true;
    return ride.status === filter;
  });

  const totalSpent = rides
    .filter(r => r.status === "completed")
    .reduce((sum, r) => sum + r.fare, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6">
        <div className="max-w-screen-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Ride History</h1>
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="pt-4">
                <p className="text-[rgba(255,248,231,0.7)] text-sm">Total Rides</p>
                <p className="text-2xl font-bold">{rides.filter(r => r.status === "completed").length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="pt-4">
                <p className="text-[rgba(255,248,231,0.7)] text-sm">Total Spent</p>
                <p className="text-2xl font-bold">₱{totalSpent}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4 pb-20">
        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Rides List */}
        <div className="space-y-3">
          {filteredRides.map((ride) => (
            <Card key={ride.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{ride.date}</span>
                    <span className="text-sm text-gray-400">{ride.time}</span>
                  </div>
                  <Badge
                    variant={ride.status === "completed" ? "default" : "secondary"}
                    className={ride.status === "cancelled" ? "bg-red-100 text-red-700" : ""}
                  >
                    {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-green-600"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{ride.pickup}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{ride.destination}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-gray-600">Driver</p>
                      <p className="text-sm font-semibold">{ride.driver}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Vehicle</p>
                      <p className="text-sm font-semibold">{ride.vehicleType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#4B0F14]">₱{ride.fare}</p>
                    {ride.status === "completed" && (
                      <div className="flex items-center gap-1 justify-end mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < ride.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {ride.status === "completed" && ride.rating === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate(`/rating/${ride.id}`)}
                  >
                    Rate this ride
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredRides.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No rides found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
