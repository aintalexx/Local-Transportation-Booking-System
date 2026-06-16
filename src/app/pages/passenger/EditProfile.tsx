import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, UserCircle, Phone, Camera } from "lucide-react";
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
} from "../../utils/validators";
import { normalizeOptionalSuffix } from "../../utils/nameFormatting";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

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

  const age = calculateAge(user?.birthdate || "");
  const isMinor = age !== null && age <= 17;

  const [profilePhoto, setProfilePhoto] = useState<string>(user?.profilePhoto || "");
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    middleName: user?.middleName || "",
    surname: user?.surname || "",
    suffix: normalizeOptionalSuffix(user?.suffix),
    phoneNumber: user?.phoneNumber || "",
    email: user?.email || "",
    guardianName: user?.guardianName || "",
    guardianPhone: user?.guardianPhone || "",
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
    const normalizedGuardianPhone = formatPHPhoneInput(formData.guardianPhone);
    const normalizedEmail = formData.email.trim();

    const basicCheck = firstInvalid([
      validateName(formData.surname, "Surname"),
      validateName(formData.firstName, "First name"),
      validateName(formData.middleName, "Middle name", false),
      validatePHPhone(normalizedPhone),
      validateEmail(normalizedEmail),
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

    // Validate guardian info for minors
    if (isMinor) {
      const guardianCheck = firstInvalid([
        validateName(formData.guardianName, "Guardian name"),
        validatePHPhone(normalizedGuardianPhone, "Guardian phone number"),
      ]);

      if (!guardianCheck.valid) {
        toast.error(guardianCheck.message);
        return;
      }
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
      guardianName: normalizeSpaces(formData.guardianName),
      guardianPhone: normalizedGuardianPhone,
      profilePhoto,
    };

    // Update in database
    const success = updateUser(user.username, updatedUser);

    if (!success) {
      toast.error("Failed to update profile in database");
      return;
    }

    // Update current user context
    setUser(updatedUser);
    toast.success("Profile updated successfully!");
    navigate("/passenger/profile");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6">
        <div className="max-w-screen-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate("/passenger/profile")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4 pb-20">

        {/* Profile Photo */}
        <div className="flex flex-col items-center mb-5">
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
              htmlFor="photoInput"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "#4B0F14", border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            >
              <Camera size={14} color="#D4AF37" />
            </label>
            <input
              id="photoInput"
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
            <CardTitle>Personal & Contact Information</CardTitle>
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
                  required
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

        {/* Guardian Information for Minors */}
        {isMinor && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-orange-600" />
                Guardian Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  As a minor (17 or below), guardian information is required.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian's Full Name</Label>
                <Input
                  id="guardianName"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  placeholder="Guardian's full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianPhone">Guardian's Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="guardianPhone"
                    type="tel"
                    value={formData.guardianPhone}
                    onChange={(e) => {
                      const formatted = formatPHPhoneInput(e.target.value);
                      setFormData({ ...formData, guardianPhone: formatted });
                    }}
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="09XXXXXXXXX"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Format: 09XXXXXXXXX</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pt-4 space-y-2">
          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => navigate("/passenger/profile")} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
