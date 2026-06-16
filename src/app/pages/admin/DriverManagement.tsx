import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Search, Star, Phone, Mail, Check, X, Ban, Clock } from "lucide-react";
import { toast } from "sonner";
import { getAllUsers, updateUser, type UserData } from "../../utils/userDatabase";
import { formatPersonName } from "../../utils/nameFormatting";

export default function DriverManagement() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drivers, setDrivers] = useState<UserData[]>([]);

  const loadDrivers = () => {
    const all = getAllUsers();
    setDrivers(all.filter(u => u.role === "driver"));
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const filteredDrivers = drivers.filter(driver => {
    const status = driver.approvalStatus || "pending";
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && status === "pending") ||
      (filter === "approved" && status === "approved") ||
      (filter === "rejected" && status === "rejected");
    const q = searchQuery.toLowerCase();
    const fullName = formatPersonName(driver, "");
    const matchesSearch =
      fullName.toLowerCase().includes(q) ||
      driver.phoneNumber.includes(q) ||
      (driver.plateNumber || "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleApprove = (username: string) => {
    updateUser(username, { approvalStatus: "approved" });
    toast.success("Driver approved successfully");
    loadDrivers();
  };

  const handleReject = (username: string) => {
    updateUser(username, { approvalStatus: "rejected" });
    toast.error("Driver application rejected");
    loadDrivers();
  };

  const handleBlock = (username: string) => {
    if (confirm("Are you sure you want to block this driver?")) {
      updateUser(username, { approvalStatus: "rejected" });
      toast.success("Driver blocked");
      loadDrivers();
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500 text-white">Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Driver Management</h1>
        <p className="text-gray-600">Review applications and manage all drivers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Drivers", value: drivers.length, color: "text-gray-900" },
          { label: "Pending Approval", value: drivers.filter(d => (d.approvalStatus || "pending") === "pending").length, color: "text-amber-600" },
          { label: "Approved", value: drivers.filter(d => d.approvalStatus === "approved").length, color: "text-green-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Drivers List */}
      {filteredDrivers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No drivers found</p>
          <p className="text-sm mt-1">Registered drivers will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDrivers.map((driver) => {
            const status = driver.approvalStatus || "pending";
            const fullName = formatPersonName(driver, driver.username);
            return (
              <Card key={driver.username}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                        {driver.firstName?.charAt(0)}{driver.surname?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-lg">{fullName}</h3>
                        {statusBadge(status)}
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-3">
                        <div className="flex min-w-0 items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{driver.phoneNumber}</span>
                        </div>
                        {driver.email && (
                          <div className="flex min-w-0 items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{driver.email}</span>
                          </div>
                        )}
                        <div>Plate: <span className="font-semibold">{driver.plateNumber || "N/A"}</span></div>
                      </div>
                      {driver.memberSince && (
                        <p className="text-xs text-gray-400 mt-1">Registered: {driver.memberSince}</p>
                      )}
                      {status === "approved" && (driver.rating || 0) > 0 && (
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{driver.rating?.toFixed(1)}</span>
                          </div>
                          <span className="text-sm text-gray-600">{driver.totalTrips} trips</span>
                        </div>
                      )}
                      {driver.driverLicensePhoto && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Driver's License:</p>
                          <img
                            src={driver.driverLicensePhoto}
                            alt="Driver License"
                            className="h-16 object-contain rounded border"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col">
                      {status === "pending" && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(driver.username)}>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => handleReject(driver.username)}>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {status === "approved" && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => handleBlock(driver.username)}>
                          <Ban className="h-4 w-4 mr-1" />
                          Block
                        </Button>
                      )}
                      {status === "rejected" && (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => handleApprove(driver.username)}>
                          <Check className="h-4 w-4 mr-1" />
                          Re-approve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
