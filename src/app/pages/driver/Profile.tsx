import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { User, Phone, Mail, Bike, Star, DollarSign, LogOut, FileText, HelpCircle, Trash2, ShieldCheck, MonitorX } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { deleteUser } from "../../utils/userDatabase";
import { toast } from "sonner";
import { formatPersonName } from "../../utils/nameFormatting";

export default function DriverProfile() {
  const navigate = useNavigate();
  const {
    user: currentUser,
    logout,
    signOutAllDevices,
    forgetTrustedDevice,
    isTrustedDevice,
    concurrentSessionCount,
    idleTimeoutMinutes,
  } = useUser();

  const driver = {
    name: formatPersonName(currentUser, "Driver"),
    phone: currentUser?.phoneNumber || "N/A",
    email: currentUser?.email || "Not set",
    vehicleType: currentUser?.vehicleType || "Tricycle",
    plateNumber: currentUser?.plateNumber || "ABC 1234",
    vehicleColor: currentUser?.vehicleColor || "Blue",
    rating: currentUser?.rating || 4.8,
    totalTrips: currentUser?.totalTrips || 0,
    totalEarnings: currentUser?.totalEarnings || 0,
    memberSince: currentUser?.memberSince || "N/A",
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  const handleSignOutAllDevices = () => {
    if (confirm("Sign out this account on all devices?")) {
      signOutAllDevices();
      navigate("/login");
    }
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;

    const confirmation = confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted."
    );

    if (!confirmation) return;

    const secondConfirmation = confirm(
      "This is your last chance! Are you absolutely sure you want to delete your account?"
    );

    if (!secondConfirmation) return;

    // Delete from database
    const success = deleteUser(currentUser.username);

    if (success) {
      toast.success("Account deleted successfully");
      logout();
      navigate("/login");
    } else {
      toast.error("Failed to delete account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6 pb-16">
        <div className="max-w-screen-md mx-auto">
          <h1 className="text-2xl font-bold">Driver Profile</h1>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-4 -mt-10 pb-20">
        <Card className="shadow-lg mb-4">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-start gap-4 sm:items-center">
              <Avatar className="h-20 w-20 shrink-0">
                {currentUser?.profilePhoto && (
                  <AvatarImage src={currentUser.profilePhoto} alt="Profile" />
                )}
                <AvatarFallback className="text-2xl bg-[rgba(75,15,20,0.08)] text-[#4B0F14]">{driver.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-bold">{driver.name}</h2>
                <p className="break-words text-gray-600">Driver since {driver.memberSince}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{driver.rating}</span>
                  <Badge variant="secondary">{driver.totalTrips} trips</Badge>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => navigate("/driver/edit-profile")}>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-1 flex min-w-0 items-center gap-2">
                <DollarSign className="h-5 w-5 shrink-0 text-green-600" />
                <p className="text-sm text-gray-600">Total Earnings</p>
              </div>
              <p className="break-words text-2xl font-bold text-green-600">₱{driver.totalEarnings.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="mb-1 flex min-w-0 items-center gap-2">
                <Star className="h-5 w-5 shrink-0 text-yellow-600" />
                <p className="text-sm text-gray-600">Rating</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{driver.rating}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Bike className="h-5 w-5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600">Vehicle Type</p>
                <p className="break-words font-semibold">{driver.vehicleType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="h-5 w-5 shrink-0 text-gray-400 font-bold">🚗</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600">Plate Number</p>
                <p className="break-words font-semibold">{driver.plateNumber || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Phone className="h-5 w-5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600">Phone</p>
                <p className="break-words font-semibold">{driver.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Mail className="h-5 w-5 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600">Email</p>
                <p className="break-words font-semibold">{driver.email || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/support")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <HelpCircle className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="truncate">Help & Support</span>
              </div>
            </button>
            <button
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/terms")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="truncate">Terms & Conditions</span>
              </div>
            </button>
            <button
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/privacy")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="truncate">Privacy Policy</span>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Device & Session</CardTitle>
            <CardDescription>
              Idle timeout: {idleTimeoutMinutes} minutes
              {concurrentSessionCount > 0 ? ` · ${concurrentSessionCount} other active session${concurrentSessionCount > 1 ? "s" : ""} detected` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="truncate">{isTrustedDevice ? "Trusted device" : "Device not trusted"}</span>
              </div>
              {isTrustedDevice && (
                <Button type="button" variant="outline" size="sm" onClick={forgetTrustedDevice}>
                  Forget
                </Button>
              )}
            </div>
            <button
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={handleSignOutAllDevices}
            >
              <div className="flex min-w-0 items-center gap-3 text-red-600">
                <MonitorX className="h-5 w-5 shrink-0" />
                <span className="truncate font-semibold">Sign out all devices</span>
              </div>
            </button>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full border-red-500 text-red-500 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>

        {/* Delete Account */}
        <Button
          variant="outline"
          className="w-full mt-2 border-red-700 text-red-700 hover:bg-red-100"
          onClick={handleDeleteAccount}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
      </div>
    </div>
  );
}
