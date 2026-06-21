import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Phone } from "lucide-react";
import { toast } from "sonner";
import logoImg from "../../../imports/logo.png";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { authAPI } from "../../utils/api";
import { findUser } from "../../utils/userDatabase";
import { getSupabaseProfileByPhone } from "../../utils/supabaseProfiles";
import { formatPHPhoneInput, validatePHPhone } from "../../utils/validators";

function maskAccountTarget(value: string): string {
  const phone = formatPHPhoneInput(value);
  return phone.length === 11 ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : value;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = formatPHPhoneInput(mobileNumber);

    if (!normalizedPhone) {
      toast.error("Mobile number is required.");
      return;
    }

    const phoneCheck = validatePHPhone(normalizedPhone, "Mobile number");
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    setLoading(true);
    try {
      const localUser = findUser(normalizedPhone);
      const supabaseProfile = await getSupabaseProfileByPhone(normalizedPhone, "passenger");
      const isPassengerAccount = localUser?.role === "passenger" || supabaseProfile?.role === "passenger";

      if (!isPassengerAccount) {
        toast.error("Mobile number not found.");
        return;
      }

      const resetResult = await authAPI.requestPasswordReset(normalizedPhone, "passenger");
      const generatedOtp = resetResult.generatedOtp;
      toast.success(`Demo OTP: ${generatedOtp}`, { duration: 10000 });
      navigate("/otp", {
        state: {
          mode: "forgot-password",
          role: "passenger",
          phoneNumber: normalizedPhone,
          identifier: localUser?.username || normalizedPhone,
          accountLabel: maskAccountTarget(normalizedPhone),
          generatedOtp,
          userData: localUser || (supabaseProfile ? {
            supabaseId: supabaseProfile.id,
            username: supabaseProfile.username || `passenger_${normalizedPhone.replace(/\D/g, "")}`,
            phoneNumber: normalizedPhone,
            surname: supabaseProfile.surname || "",
            firstName: supabaseProfile.first_name || "",
            middleName: supabaseProfile.middle_name || "",
            suffix: supabaseProfile.suffix || "",
            email: supabaseProfile.email || "",
            birthdate: supabaseProfile.birthdate || "",
            role: "passenger",
            approvalStatus: "approved",
            accountStatus: "Active",
            profilePhoto: supabaseProfile.profile_photo || "",
          } : undefined),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start password recovery.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8E7" }}>
      <div className="px-5 pt-12 pb-10" style={{ background: "linear-gradient(160deg, #4B0F14 0%, #6E171D 100%)" }}>
        <button onClick={() => navigate("/login")} className="flex items-center gap-2 mb-6" style={{ color: "rgba(255,248,231,0.65)" }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: 14 }}>Back to Login</span>
        </button>
        <div className="flex items-center justify-center overflow-hidden mb-4" style={{ width: 44, height: 44, borderRadius: 14, background: "white", border: "1.5px solid rgba(212,175,55,0.3)" }}>
          <img src={logoImg} alt="Arangkada Logo" className="w-full h-full object-contain p-1" />
        </div>
        <h1 style={{ color: "#FFF8E7", fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>Recover password</h1>
        <p style={{ color: "rgba(255,248,231,0.68)", fontSize: 14, marginTop: 6 }}>
          Reset access using the mobile number used during passenger registration.
        </p>
      </div>

      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
              Registered Mobile Number
            </label>
            <div className="relative">
              <Phone size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                type="tel"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(formatPHPhoneInput(event.target.value))}
                className="h-14 rounded-2xl border-2 bg-white pl-11"
                placeholder="Enter 09 mobile number"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-14 w-full rounded-2xl bg-[#4B0F14] text-[#D4AF37] hover:bg-[#6E171D]">
            {loading ? "Checking account..." : "Continue"}
          </Button>

          <p className="rounded-2xl border border-[#4B0F14]/10 bg-white p-4 text-sm leading-6 text-[#7a6a5a]">
            Demo OTP mode uses sample code 123456. No real SMS is sent yet.
          </p>
        </form>
      </div>
    </div>
  );
}
