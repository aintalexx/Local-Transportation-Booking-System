import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatPHPhoneInput, validatePHPhone } from "../../utils/validators";
import { getSupabaseDriverByPhone } from "../../utils/supabaseDrivers";
import { findUser } from "../../utils/userDatabase";
import { createDemoOtp } from "../../utils/demoOtp";
import { getSupabaseProfileByPhone } from "../../utils/supabaseProfiles";

export default function DriverForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    const phoneInput = phone.trim();
    if (!phoneInput) {
      toast.error("Mobile number is required.");
      return;
    }

    const phoneValidation = validatePHPhone(phoneInput, "Mobile number");
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.message);
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = formatPHPhoneInput(phoneInput);

      // Check Supabase drivers table first
      let driverFound = false;
      const localUser = findUser(normalizedPhone);
      const dbDriver = await getSupabaseDriverByPhone(normalizedPhone);
      if (dbDriver) {
        driverFound = true;
      }

      const profileDriver = await getSupabaseProfileByPhone(normalizedPhone, "driver");
      if (profileDriver) {
        driverFound = true;
      }

      // Local fallback: check local user database for driver accounts
      if (!driverFound) {
        if (localUser && localUser.role === "driver") {
          driverFound = true;
        }
      }

      if (!driverFound) {
        toast.error("Mobile number not found.");
        return;
      }

      // Generate demo OTP and navigate to OTP verification page
      const otp = createDemoOtp();
      toast.success(`Demo OTP: ${otp}`, { duration: 10000 });

      navigate("/otp", {
        state: {
          mode: "driver-forgot-password",
          role: "driver",
          phoneNumber: normalizedPhone,
          identifier: localUser?.username || normalizedPhone,
          accountLabel: normalizedPhone,
          generatedOtp: otp,
          userData: localUser || (dbDriver ? {
            supabaseId: dbDriver.id,
            username: `driver_${normalizedPhone.replace(/\D/g, "")}`,
            phoneNumber: normalizedPhone,
            surname: dbDriver.surname || "",
            firstName: dbDriver.first_name || "",
            middleName: dbDriver.middle_name || "",
            suffix: dbDriver.suffix || "",
            email: "",
            birthdate: dbDriver.birthdate || "",
            role: "driver",
            vehicleType: dbDriver.vehicle_type || "Tricycle",
            plateNumber: dbDriver.plate_number || "",
            licenseNumber: dbDriver.license_number || "",
            validIdPhoto: dbDriver.valid_id_photo || "",
            orCrPhoto: dbDriver.or_cr_photo || "",
            clearancePhoto: dbDriver.clearance_photo || "",
            vehiclePhoto: dbDriver.vehicle_photo || "",
            profilePhoto: dbDriver.profile_photo || "",
            approvalStatus: dbDriver.approval_status || "pending",
            accountStatus: dbDriver.account_status || "Active",
          } : profileDriver ? {
            supabaseId: profileDriver.id,
            username: profileDriver.username || `driver_${normalizedPhone.replace(/\D/g, "")}`,
            phoneNumber: normalizedPhone,
            surname: profileDriver.surname || "",
            firstName: profileDriver.first_name || "",
            middleName: profileDriver.middle_name || "",
            suffix: profileDriver.suffix || "",
            email: profileDriver.email || "",
            birthdate: profileDriver.birthdate || "",
            role: "driver",
            vehicleType: profileDriver.vehicle_type || "Tricycle",
            plateNumber: profileDriver.plate_number || "",
            licenseNumber: profileDriver.license_number || "",
            profilePhoto: profileDriver.profile_photo || "",
            approvalStatus: profileDriver.approval_status || "pending",
            accountStatus: profileDriver.account_status || "Active",
          } : undefined),
        },
      });
    } catch (err) {
      console.error("Driver forgot password error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8E7" }}>
      {/* Maroon header */}
      <div className="px-5 pt-12 pb-10" style={{ background: "linear-gradient(160deg, #4B0F14 0%, #6E171D 100%)" }}>
        <button onClick={() => navigate("/login")} className="flex items-center gap-2 mb-6" style={{ color: "rgba(255,248,231,0.65)" }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: 14 }}>Back to Login</span>
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(212,175,55,0.18)", border: "1.5px solid rgba(212,175,55,0.3)" }}>
            <ShieldCheck size={22} color="#D4AF37" />
          </div>
          <div>
            <p style={{ color: "#FFF8E7", fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>Arangkada</p>
            <p style={{ color: "#D4AF37", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Sta. Mesa</p>
          </div>
        </div>
        <h1 style={{ color: "#FFF8E7", fontSize: 26, fontWeight: 800, marginTop: 20, lineHeight: 1.1 }}>Forgot Password</h1>
        <p style={{ color: "rgba(255,248,231,0.6)", fontSize: 14, marginTop: 4 }}>Verify your registered phone number to recover your driver account.</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
              Registered Phone Number
            </label>
            <div className="relative">
              <Phone size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Enter phone number (e.g. 09123456789)"
                value={phone}
                onChange={e => setPhone(formatPHPhoneInput(e.target.value))}
                className="w-full pl-11 pr-4 rounded-2xl outline-none"
                style={{
                  height: 52,
                  background: "#ffffff",
                  border: showValidation && !phone ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)",
                  color: "#1E1E1E",
                  fontSize: 15,
                }}
              />
            </div>
            {showValidation && !phone && (
              <p style={{ color: "#C62828", fontSize: 12, marginTop: 4 }}>Phone number is required.</p>
            )}
          </div>

          {/* Info card */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(75,15,20,0.1)", background: "rgba(75,15,20,0.03)" }}>
            <p style={{ color: "#7a6a5a", fontSize: 13, lineHeight: 1.6 }}>
              Enter the mobile number you registered with. Demo OTP mode uses sample code 123456 before password reset.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: loading ? "rgba(75,15,20,0.5)" : "linear-gradient(135deg, #4B0F14, #6E171D)",
              boxShadow: "0 6px 20px rgba(75,15,20,0.3)",
            }}
          >
            <span style={{ color: "#D4AF37", fontSize: 16, fontWeight: 800 }}>
              {loading ? "Checking account..." : "Send Verification Code"}
            </span>
          </button>
        </form>

        <p className="text-center mt-6" style={{ color: "#7a6a5a", fontSize: 14 }}>
          Remember your account?{" "}
          <button onClick={() => navigate("/login")} style={{ color: "#4B0F14", fontWeight: 800 }}>
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}
