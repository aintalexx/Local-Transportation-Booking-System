import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, Phone, Bike, Camera } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { toast } from "sonner";
import { getAllUsers, updateUser } from "../../utils/userDatabase";
import { uploadBase64ToStorage } from "../../utils/supabaseDrivers";
import {
  getCurrentSupabaseUserId,
  profileUsernameExistsForOther,
  updateApprovedDriverEditableProfile,
} from "../../utils/supabaseProfiles";
import {
  firstInvalid,
  normalizeSpaces,
  validateName,
  validateUsername,
} from "../../utils/validators";
import { normalizeOptionalSuffix } from "../../utils/nameFormatting";

export default function DriverEditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [profilePhoto, setProfilePhoto] = useState<string>(user?.profilePhoto || "");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    firstName: user?.firstName || "",
    middleName: user?.middleName || "",
    surname: user?.surname || "",
    suffix: normalizeOptionalSuffix(user?.suffix),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    if (isSaving) return;

    const normalizedUsername = formData.username.trim();

    const basicCheck = firstInvalid([
      validateUsername(normalizedUsername),
      validateName(formData.surname, "Surname"),
      validateName(formData.firstName, "First name"),
      validateName(formData.middleName, "Middle name", false),
    ]);

    if (!basicCheck.valid) {
      toast.error(basicCheck.message);
      return;
    }

    const profileId = user.supabaseId || await getCurrentSupabaseUserId();
    if (!profileId) {
      toast.error("Unable to save profile. Please log in again.");
      return;
    }

    const usernameCheck = await profileUsernameExistsForOther(normalizedUsername, profileId);
    if (usernameCheck.error) {
      toast.error(usernameCheck.error);
      return;
    }

    const localUsernameExists = getAllUsers().some(
      (item) =>
        item.username.toLowerCase() === normalizedUsername.toLowerCase() &&
        item.username !== user.username &&
        item.supabaseId !== profileId
    );

    if (usernameCheck.exists || localUsernameExists) {
      toast.error("Username already exists. Please use a different username.");
      return;
    }

    const nextName = {
      firstName: normalizeSpaces(formData.firstName),
      middleName: normalizeSpaces(formData.middleName),
      surname: normalizeSpaces(formData.surname),
      suffix: normalizeOptionalSuffix(formData.suffix),
    };
    const nameFieldsChanged =
      nextName.firstName !== (user.firstName || "") ||
      nextName.middleName !== (user.middleName || "") ||
      nextName.surname !== (user.surname || "") ||
      nextName.suffix !== normalizeOptionalSuffix(user.suffix);

    setIsSaving(true);

    let savedProfilePhoto = profilePhoto;
    if (profilePhoto && profilePhoto.startsWith("data:")) {
      const uploadedPhoto = await uploadBase64ToStorage(profilePhoto, `profiles/${profileId}/profile.jpg`);
      if (!uploadedPhoto) {
        toast.error("Failed to upload profile photo.");
        setIsSaving(false);
        return;
      }
      savedProfilePhoto = uploadedPhoto;
    }

    const updatedUser = {
      ...user,
      ...nextName,
      username: normalizedUsername,
      displayName: nameFieldsChanged ? "" : user.displayName,
      profilePhoto: savedProfilePhoto,
    };

    const { profile, error } = await updateApprovedDriverEditableProfile(user, {
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      middleName: updatedUser.middleName,
      surname: updatedUser.surname,
      suffix: updatedUser.suffix,
      profilePhoto: updatedUser.profilePhoto,
    });

    if (error || !profile) {
      toast.error(error || "Failed to save profile to Supabase.");
      setIsSaving(false);
      return;
    }

    const savedUser = {
      ...updatedUser,
      supabaseId: profile.id,
      username: profile.username || updatedUser.username,
      firstName: profile.first_name || updatedUser.firstName,
      middleName: profile.middle_name || "",
      surname: profile.surname || updatedUser.surname,
      suffix: normalizeOptionalSuffix(profile.suffix || updatedUser.suffix),
      phoneNumber: user.phoneNumber,
      email: user.email || "",
      vehicleType: user.vehicleType,
      plateNumber: user.plateNumber,
      vehicleColor: user.vehicleColor,
      approvalStatus: user.approvalStatus,
      accountStatus: user.accountStatus,
      role: "driver" as const,
      profilePhoto: profile.profile_photo || "",
    };

    updateUser(user.username, savedUser);
    setUser(savedUser);
    toast.success("Profile updated successfully!");
    setIsSaving(false);
    navigate("/driver/profile");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6">
        <div className="max-w-screen-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate("/driver/profile")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4 pb-20 space-y-4">

        {/* Profile Photo */}
        <div className="flex flex-col items-center mb-2">
          <div className="relative">
            <div
              className="h-24 w-24 rounded-3xl overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(75,15,20,0.08)", border: "3px solid rgba(75,15,20,0.2)" }}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span style={{ color: "#4B0F14", fontSize: 36, fontWeight: 900 }}>
                  {(formData.firstName || user?.firstName || "?").charAt(0)}
                </span>
              )}
            </div>
            <label
              htmlFor="driverPhotoInput"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "#4B0F14", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            >
              <Camera size={14} color="#D4AF37" />
            </label>
            <input
              id="driverPhotoInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <p style={{ color: "#7a6a5a", fontSize: 12, marginTop: 8 }}>Tap to change photo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surname">Surname</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                placeholder="Jr., Sr., III, etc."
              />
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-[#4B0F14]" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input value={user?.phoneNumber || ""} className="pl-10" readOnly disabled />
              </div>
              <p className="text-xs text-gray-500">Phone number is locked after driver approval.</p>
            </div>

            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Input value={user?.vehicleType || "Tricycle"} readOnly disabled />
            </div>

            <div className="space-y-2">
              <Label>Plate Number</Label>
              <Input value={user?.plateNumber || "Not set"} readOnly disabled />
            </div>

            <div className="space-y-2">
              <Label>Vehicle Color</Label>
              <Input value={user?.vehicleColor || "Not set"} readOnly disabled />
            </div>

            <div className="space-y-2">
              <Label>Approval Status</Label>
              <Input value={user?.approvalStatus || "pending"} readOnly disabled />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Vehicle details, documents, phone number, approval status, account status, and role are reviewed by admin and cannot be edited here.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/driver/profile")} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
