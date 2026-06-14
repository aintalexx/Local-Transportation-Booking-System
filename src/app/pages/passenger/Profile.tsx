import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { User, Phone, Mail, MapPin, Bell, HelpCircle, FileText, LogOut, ChevronRight, Star, Calendar, UserCircle, Trash2 } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { format } from "date-fns";
import { deleteUser } from "../../utils/userDatabase";
import { toast } from "sonner";

export default function PassengerProfile() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useUser();

  const calculateAge = (birthdate: string) => {
    if (!birthdate) return null;
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const user = {
    name: currentUser ? `${currentUser.firstName} ${currentUser.middleName} ${currentUser.surname} ${currentUser.suffix}`.trim() : "Guest",
    phone: currentUser?.phoneNumber || "N/A",
    email: currentUser?.email || "Not set",
    photo: null,
    memberSince: currentUser?.memberSince || "N/A",
    totalRides: currentUser?.totalTrips || 0,
    rating: currentUser?.rating || 5.0,
    birthdate: currentUser?.birthdate || "",
    surname: currentUser?.surname || "",
    firstName: currentUser?.firstName || "",
    middleName: currentUser?.middleName || "",
    suffix: currentUser?.suffix || "",
    guardianName: currentUser?.guardianName || "",
    guardianPhone: currentUser?.guardianPhone || "",
  };

  const age = calculateAge(user.birthdate);
  const isMinor = age !== null && age <= 17;

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
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6 pb-16">
        <div className="max-w-screen-md mx-auto">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-4 -mt-10 pb-20">
        {/* Profile Card */}
        <Card className="shadow-lg mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser?.profilePhoto || user.photo || undefined} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-gray-600">Member since {user.memberSince}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{user.rating}</span>
                  <Badge variant="secondary" className="ml-2">{user.totalRides} rides</Badge>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => navigate("/passenger/edit-profile")}>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                <p className="text-sm text-gray-600">Surname</p>
                <p className="font-semibold">{user.surname}</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-sm text-gray-600">First Name</p>
                <p className="font-semibold">{user.firstName}</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-sm text-gray-600">Middle Name</p>
                <p className="font-semibold">{user.middleName || "N/A"}</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-sm text-gray-600">Suffix</p>
                <p className="font-semibold">{user.suffix || "None"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Birthdate</p>
                <p className="font-semibold">
                  {user.birthdate && user.birthdate !== ""
                    ? format(new Date(user.birthdate), "MMMM dd, yyyy")
                    : "Not set"}
                </p>
              </div>
            </div>

            {/* Guardian Information for Minors */}
            {isMinor && user.guardianName && (
              <>
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Guardian Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-orange-50 border-orange-200">
                      <UserCircle className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Guardian Name</p>
                        <p className="font-semibold">{user.guardianName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-orange-50 border-orange-200">
                      <Phone className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Guardian Phone</p>
                        <p className="font-semibold">{user.guardianPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Phone className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{user.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Mail className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{user.email || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>Saved Locations</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <span>Notifications</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </CardContent>
        </Card>

        {/* Support & Legal */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Support & Legal</CardTitle>
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
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/terms")}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span>Terms & Conditions</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate("/privacy")}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span>Privacy Policy</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </CardContent>
        </Card>

        {/* Logout */}
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
