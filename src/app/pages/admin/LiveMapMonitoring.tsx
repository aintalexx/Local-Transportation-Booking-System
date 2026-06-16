import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Navigation2, MapPin, Users } from "lucide-react";

export default function LiveMapMonitoring() {
  const activeDrivers = [
    { id: 1, name: "Pedro Santos", vehicle: "Tricycle", plate: "ABC 123", status: "with_passenger", location: "Sta. Mesa" },
    { id: 2, name: "Maria Garcia", vehicle: "E-Bike", plate: "XYZ 456", status: "available", location: "Pureza" },
    { id: 3, name: "Jose Reyes", vehicle: "Tricycle", plate: "DEF 789", status: "with_passenger", location: "V. Mapa" },
  ];

  const ongoingRides = [
    { id: 1, driver: "Pedro Santos", passenger: "Juan Cruz", from: "PUP", to: "SM City Sta. Mesa", progress: 65 },
    { id: 2, driver: "Jose Reyes", passenger: "Ana Lopez", from: "Sta. Mesa Market", to: "V. Mapa", progress: 40 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Map Monitoring</h1>
        <p className="text-gray-600">Real-time tracking of drivers and rides</p>
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardContent className="pt-6">
          <div className="bg-gradient-to-br from-[rgba(75,15,20,0.08)] via-green-100 to-purple-100 rounded-lg" style={{ height: "400px" }}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-[#4B0F14] mx-auto mb-3" />
                <p className="text-gray-700 font-semibold">Live Map View</p>
                <p className="text-sm text-gray-600">Real-time driver and ride tracking</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Active Drivers */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 shrink-0" />
                Active Drivers ({activeDrivers.length})
              </h3>
            </div>
            <div className="space-y-3">
              {activeDrivers.map((driver) => (
                <div key={driver.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Navigation2 className={`h-5 w-5 shrink-0 ${driver.status === "with_passenger" ? "text-green-600" : "text-[#4B0F14]"}`} />
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{driver.name}</p>
                      <p className="break-words text-sm text-gray-600">{driver.vehicle} - {driver.plate}</p>
                    </div>
                  </div>
                  <Badge variant={driver.status === "with_passenger" ? "default" : "secondary"}>
                    {driver.status === "with_passenger" ? "Busy" : "Available"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ongoing Rides */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-4">Ongoing Rides ({ongoingRides.length})</h3>
            <div className="space-y-3">
              {ongoingRides.map((ride) => (
                <div key={ride.id} className="p-3 border rounded-lg">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{ride.passenger}</p>
                      <p className="break-words text-sm text-gray-600">Driver: {ride.driver}</p>
                    </div>
                    <Badge className="bg-green-500">{ride.progress}%</Badge>
                  </div>
                  <div className="mb-2 break-words text-sm text-gray-600">
                    {ride.from} → {ride.to}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${ride.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
