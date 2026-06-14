import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { TrendingUp, Users, DollarSign, Navigation2 } from "lucide-react";
import { useState } from "react";

export default function Analytics() {
  const [timeFilter, setTimeFilter] = useState("daily");

  const stats = {
    totalRides: 2456,
    completedRides: 2340,
    cancelledRides: 116,
    activeUsers: 1523,
    totalRevenue: 145680,
    avgFare: 48,
    peakHour: "5:00 PM - 6:00 PM",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-600">Business insights and statistics</p>
        </div>
        <Tabs value={timeFilter} onValueChange={setTimeFilter}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <Navigation2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRides.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +15% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Rides</CardTitle>
            <Navigation2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRides.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.completedRides / stats.totalRides) * 100).toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ride Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-[rgba(75,15,20,0.08)] to-purple-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Chart: Ride volume over time</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-green-50 to-[rgba(75,15,20,0.08)] rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Chart: Hourly distribution</p>
                <p className="text-lg font-semibold">Peak: {stats.peakHour}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Locations */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "PUP Sta. Mesa", rides: 450 },
              { name: "San Juan City Hall", rides: 380 },
              { name: "Divisoria Market", rides: 320 },
              { name: "V. Mapa Station", rides: 280 },
            ].map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{location.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-[#4B0F14] h-2 rounded-full"
                      style={{ width: `${(location.rides / 450) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="ml-4 font-bold text-[#4B0F14]">{location.rides}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
