import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { User, Phone, Mail, Bike, Star, DollarSign, LogOut, FileText, HelpCircle, Trash2 } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { deleteUser } from "../../utils/userDatabase";
import { toast } from "sonner";

export default function DriverProfile() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useUser();

  const driver = {
    name: currentUser ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.surname}`.trim() : "Driver",
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
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 pb-16">
        <div className="max-w-screen-md mx-auto">
          <h1 className="text-2xl font-bold">Driver Profile</h1>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-4 -mt-10 pb-20">
        <Card className="shadow-lg mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-20 w-20">
                {currentUser?.profilePhoto && (
                  <AvatarImage src={currentUser.profilePhoto} alt="Profile" />
                )}
                <AvatarFallback className="text-2xl bg-green-100 text-green-600">{driver.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{driver.name}</h2>
                <p className="text-gray-600">Driver since {driver.memberSince}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{driver.rating}</span>
                  <Badge variant="secondary" className="ml-2">{driver.totalTrips} trips</Badge>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => navigate("/driver/edit-profile")}>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-green-600" />
                <p className="text-sm text-gray-600">Total Earnings</p>
              </div>
              <p className="text-2xl font-bold text-green-600">₱{driver.totalEarnings.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-5 w-5 text-yellow-600" />
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
              <Bike className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Vehicle Type</p>
                <p className="font-semibold">{driver.vehicleType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="h-5 w-5 text-gray-400 font-bold">🚗</div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Plate Number</p>
                <p className="font-semibold">{driver.plateNumber || "Not set"}</p>
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
              <Phone className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{driver.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Mail className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{driver.email || "Not set"}</p>
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
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/support")}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-gray-400" />
                <span>Help & Support</span>
              </div>
            </button>
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/terms")}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span>Terms & Conditions</span>
              </div>
            </button>
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/privacy")}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span>Privacy Policy</span>
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
