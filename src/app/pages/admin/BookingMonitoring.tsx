import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Search, MapPin, Clock } from "lucide-react";

export default function BookingMonitoring() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const bookings = [
    { id: 1, passenger: "Juan Cruz", driver: "Pedro Santos", pickup: "PUP Sta. Mesa", destination: "San Juan", fare: 45, status: "ongoing", time: "14:30", date: "2026-06-07" },
    { id: 2, passenger: "Maria Garcia", driver: "Jose Reyes", pickup: "Divisoria", destination: "Sta. Mesa", fare: 60, status: "completed", time: "13:15", date: "2026-06-07" },
    { id: 3, passenger: "Ana Lopez", driver: "Carlos Mendoza", pickup: "V. Mapa", destination: "PUP", fare: 35, status: "ongoing", time: "14:45", date: "2026-06-07" },
    { id: 4, passenger: "Jose Santos", driver: "Maria Garcia", pickup: "San Juan", destination: "Divisoria", fare: 55, status: "cancelled", time: "12:30", date: "2026-06-07" },
  ];

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === "all" || b.status === filter;
    const matchesSearch = b.passenger.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.driver.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Booking Monitoring</h1>
        <p className="text-gray-600">Track and manage all ride bookings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by passenger or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{booking.date} at {booking.time}</span>
                  </div>
                  <p className="font-semibold">Passenger: {booking.passenger}</p>
                  <p className="text-sm text-gray-600">Driver: {booking.driver}</p>
                </div>
                <Badge variant={
                  booking.status === "completed" ? "default" :
                  booking.status === "ongoing" ? "secondary" :
                  "destructive"
                }>
                  {booking.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-600"></div>
                  </div>
                  <span className="text-sm">{booking.pickup}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{booking.destination}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-gray-600">Fare</span>
                <span className="text-xl font-bold text-green-600">₱{booking.fare}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
