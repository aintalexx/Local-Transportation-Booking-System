import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, UserCheck, Navigation2, CheckCircle, XCircle, Clock, DollarSign, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const stats = {
    totalUsers: 1523,
    totalPassengers: 1234,
    totalDrivers: 289,
    activeDrivers: 45,
    activeRides: 12,
    completedToday: 234,
    cancelledToday: 8,
    pendingApprovals: 15,
    revenueToday: 12450,
  };

  const recentBookings = [
    { id: "1", passenger: "Juan Cruz", driver: "Pedro Santos", status: "ongoing", fare: 45 },
    { id: "2", passenger: "Maria Garcia", driver: "Jose Reyes", status: "completed", fare: 60 },
    { id: "3", passenger: "Ana Lopez", driver: "Carlos Mendoza", status: "ongoing", fare: 35 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome to Arangkada Admin Panel</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
            <UserCheck className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPassengers.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Registered passengers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Navigation2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
            <p className="text-xs text-gray-500">
              <span className="text-green-600 font-semibold">{stats.activeDrivers}</span> currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Rides</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRides}</div>
            <p className="text-xs text-gray-500">Rides in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-gray-500">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledToday}</div>
            <p className="text-xs text-gray-500">Cancelled rides</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-gray-500">Driver applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.revenueToday.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12% from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{booking.passenger}</p>
                  <p className="truncate text-sm text-gray-600">Driver: {booking.driver}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-green-600">₱{booking.fare}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      booking.status === "ongoing"
                        ? "bg-[rgba(75,15,20,0.08)] text-[#4B0F14]"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
