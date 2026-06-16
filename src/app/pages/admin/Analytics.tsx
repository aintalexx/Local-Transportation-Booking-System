import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { TrendingUp, Users, DollarSign, Navigation2 } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const rideTrend = [
    { label: "Mon", rides: 280 },
    { label: "Tue", rides: 325 },
    { label: "Wed", rides: 360 },
    { label: "Thu", rides: 342 },
    { label: "Fri", rides: 430 },
    { label: "Sat", rides: 390 },
    { label: "Sun", rides: 310 },
  ];
  const peakHours = [
    { label: "6 AM", rides: 120 },
    { label: "9 AM", rides: 210 },
    { label: "12 PM", rides: 165 },
    { label: "3 PM", rides: 195 },
    { label: "6 PM", rides: 285 },
    { label: "9 PM", rides: 150 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-600">Business insights and statistics</p>
        </div>
        <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-fit">
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ride Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rideTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rideVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4B0F14" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4B0F14" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,15,20,0.1)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rides" stroke="#4B0F14" strokeWidth={2} fill="url(#rideVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,15,20,0.1)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="rides" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-center text-sm text-gray-600">Peak: {stats.peakHour}</p>
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
              { name: "SM City Sta. Mesa", rides: 380 },
              { name: "Sta. Mesa Market", rides: 320 },
              { name: "V. Mapa Station", rides: 280 },
            ].map((location, index) => (
              <div key={index} className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{location.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-[#4B0F14] h-2 rounded-full"
                      style={{ width: `${(location.rides / 450) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 font-bold text-[#4B0F14]">{location.rides}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
