import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, Phone, Bike, Camera } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { toast } from "sonner";
import { emailExists, phoneExists, updateUser } from "../../utils/userDatabase";
import {
  firstInvalid,
  formatPHPhoneInput,
  normalizeSpaces,
  validateEmail,
  validateName,
  validatePHPhone,
  validatePlateNumber,
} from "../../utils/validators";
import { normalizeOptionalSuffix } from "../../utils/nameFormatting";

export default function DriverEditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [profilePhoto, setProfilePhoto] = useState<string>(user?.profilePhoto || "");
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    middleName: user?.middleName || "",
    surname: user?.surname || "",
    suffix: normalizeOptionalSuffix(user?.suffix),
    phoneNumber: user?.phoneNumber || "",
    email: user?.email || "",
    plateNumber: user?.plateNumber || "",
    vehicleColor: user?.vehicleColor || "",
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!user) return;
    const normalizedPhone = formatPHPhoneInput(formData.phoneNumber);
    const normalizedEmail = formData.email.trim();
    const normalizedPlate = formData.plateNumber.trim().toUpperCase();

    const basicCheck = firstInvalid([
      validateName(formData.surname, "Surname"),
      validateName(formData.firstName, "First name"),
      validateName(formData.middleName, "Middle name", false),
      validatePHPhone(normalizedPhone),
      validateEmail(normalizedEmail),
      validatePlateNumber(normalizedPlate, false),
      validateName(formData.vehicleColor, "Vehicle color", false),
    ]);

    if (!basicCheck.valid) {
      toast.error(basicCheck.message);
      return;
    }

    if (phoneExists(normalizedPhone, user.username)) {
      toast.error("Phone number already registered. Please use a different number.");
      return;
    }

    if (emailExists(normalizedEmail, user.username)) {
      toast.error("Email already registered. Please use a different email.");
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

    const updatedUser = {
      ...user,
      ...nextName,
      displayName: nameFieldsChanged ? "" : user.displayName,
      phoneNumber: normalizedPhone,
      email: normalizedEmail,
      plateNumber: normalizedPlate,
      vehicleColor: normalizeSpaces(formData.vehicleColor),
      profilePhoto,
    };

    const success = updateUser(user.username, updatedUser);

    if (!success) {
      toast.error("Failed to update profile");
      return;
    }

    setUser(updatedUser);
    toast.success("Profile updated successfully!");
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
          <p style={{ color: "#7a6a5a", fontSize: 12, marginTop: 8 }}>I-tap para palitan ang larawan</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const formatted = formatPHPhoneInput(e.target.value);
                    setFormData({ ...formData, phoneNumber: formatted });
                  }}
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">Format: 09XXXXXXXXX</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                placeholder="your.email@example.com"
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
              <Label htmlFor="plateNumber">Plate Number</Label>
              <Input
                id="plateNumber"
                value={formData.plateNumber}
                onChange={(e) => {
                  const plateNumber = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
                  setFormData({ ...formData, plateNumber });
                }}
                maxLength={6}
                placeholder="ABC123"
              />
              <p className="text-xs text-gray-500">2-6 letters or numbers, no spaces.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleColor">Vehicle Color</Label>
              <Input
                id="vehicleColor"
                value={formData.vehicleColor}
                onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                placeholder="e.g. Blue, Red, White"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700">
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => navigate("/driver/profile")} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
