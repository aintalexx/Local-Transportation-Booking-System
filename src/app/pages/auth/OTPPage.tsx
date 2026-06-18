import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import logoImg from "../../../imports/logo.png";
import { useUser } from "../../context/UserContext";
import { DEMO_OTP_RESEND_SECONDS, createDemoOtp } from "../../utils/demoOtp";
import { registerUser, updateUser, type UserData } from "../../utils/userDatabase";
import { signUpWithEmailPassword } from "../../utils/supabaseAuth";
import { syncSupabaseProfile } from "../../utils/supabaseProfiles";

type OtpMode = "login" | "register" | "google-phone" | "driver-forgot-password";
const DEMO_OTP_EXPIRY_MS = DEMO_OTP_RESEND_SECONDS * 1000;

type OtpRouteState = {
  phoneNumber?: string;
  mode?: OtpMode;
  role?: "passenger" | "driver";
  userData?: Partial<UserData>;
  generatedOtp?: string;
};

function buildRegistrationUser(state: OtpRouteState): UserData {
  const userData = state.userData || {};
  const role = (state.role || userData.role || "passenger") as "passenger" | "driver";

  return {
    supabaseId: userData.supabaseId,
    displayName: userData.displayName,
    username: userData.username || "",
    password: userData.password || "",
    phoneNumber: state.phoneNumber || userData.phoneNumber || "",
    surname: userData.surname || "",
    firstName: userData.firstName || "",
    middleName: userData.middleName || "",
    suffix: userData.suffix || "",
    email: userData.email || "",
    emailConfirmed: userData.emailConfirmed || false,
    birthdate: userData.birthdate || "",
    role,
    guardianName: userData.guardianName || "",
    guardianPhone: userData.guardianPhone || "",
    rating: userData.rating || 5,
    totalTrips: userData.totalTrips || 0,
    totalEarnings: userData.totalEarnings || 0,
    vehicleType: role === "driver" ? (userData.vehicleType || "Tricycle") : "",
    plateNumber: role === "driver" ? (userData.plateNumber || "") : "",
    driverLicensePhoto: role === "driver" ? (userData.driverLicensePhoto || "") : "",
    licenseNumber: role === "driver" ? (userData.licenseNumber || "") : "",
    validIdPhoto: role === "driver" ? (userData.validIdPhoto || "") : "",
    orCrPhoto: role === "driver" ? (userData.orCrPhoto || "") : "",
    clearancePhoto: role === "driver" ? (userData.clearancePhoto || "") : "",
    vehiclePhoto: role === "driver" ? (userData.vehiclePhoto || "") : "",
    vehicleColor: userData.vehicleColor || "",
    memberSince: userData.memberSince || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: userData.approvalStatus || (role === "driver" ? "pending" : "approved"),
    profilePhoto: userData.profilePhoto || "",
  };
}

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, setUser } = useUser();
  const state = (location.state || {}) as OtpRouteState;

  const [otp, setOtp] = useState("");
  const [currentOtp, setCurrentOtp] = useState(state.generatedOtp || createDemoOtp());
  const [otpCreatedAt, setOtpCreatedAt] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(DEMO_OTP_RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!state.phoneNumber) {
      navigate("/login", { replace: true });
      return;
    }

    toast.success(`Demo OTP: ${currentOtp}`, { duration: 10000 });
  }, []);

  useEffect(() => {
    if (canResend) return;

    const timer = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [canResend]);

  const handleVerifiedRegistration = async () => {
    const user = buildRegistrationUser(state);
    const result = registerUser(user);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    let accountUser = user;
    try {
      const supabaseUser = await signUpWithEmailPassword(user);
      if (supabaseUser) accountUser = supabaseUser;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Supabase account creation failed.";
      toast.info(`Local account created. Supabase booking sync needs attention: ${message}`, { duration: 6000 });
    }

    if (accountUser.role === "driver") {
      toast.success("Phone verified. Please confirm your email before logging in.");
      navigate("/login", { replace: true });
      return;
    }

    if (accountUser.email && accountUser.emailConfirmed === false) {
      toast.success("Phone verified. Please check your email to confirm your account before logging in.", { duration: 7000 });
      navigate("/login", { replace: true });
      return;
    }

    setUser(accountUser);
    toast.success("Account created successfully!");
    navigate("/passenger", { replace: true });
  };

  const handleVerifiedGooglePhone = async () => {
    const baseUser = (state.userData || currentUser) as UserData | null;
    if (!baseUser?.username) {
      toast.error("Google account session expired. Please sign in with Google again.");
      navigate("/login", { replace: true });
      return;
    }

    const verifiedUser = {
      ...baseUser,
      phoneNumber: state.phoneNumber || "",
    };

    const updated = updateUser(baseUser.username, verifiedUser);
    if (!updated) {
      toast.error("Unable to save phone number. Please use a different number.");
      return;
    }

    try {
      await syncSupabaseProfile(verifiedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Supabase profile sync failed.";
      toast.info(`Phone saved locally. Supabase sync needs attention: ${message}`, { duration: 6000 });
    }

    setUser(verifiedUser);
    toast.success("Phone number verified successfully!");
    navigate(verifiedUser.role === "driver" ? "/pending-approval" : "/passenger", { replace: true });
  };

  const handleVerifyOTP = async () => {
    if (loading) return;

    if (otp.length !== 6) {
      toast.error("Please enter a complete 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => window.setTimeout(resolve, 700));

      if (Date.now() - otpCreatedAt > DEMO_OTP_EXPIRY_MS) {
        toast.error("OTP expired. Please generate a new demo code.");
        setOtp("");
        setCanResend(true);
        setResendTimer(0);
        return;
      }

      if (otp !== currentOtp) {
        toast.error("Invalid OTP. Please try again.");
        setOtp("");
        return;
      }

      if (state.mode === "driver-forgot-password") {
        toast.success("Phone number verified successfully. You may now log in again.", { duration: 5000 });
        navigate("/login", { replace: true });
      } else if (state.mode === "google-phone") {
        await handleVerifiedGooglePhone();
      } else if (state.mode === "register") {
        await handleVerifiedRegistration();
      } else if (state.mode === "login" && state.role === "driver") {
        const userData = state.userData as UserData;
        updateUser(userData.username, userData);
        setUser(userData);
        toast.success("Login successful!");
        if (userData.approvalStatus === "approved" && userData.accountStatus === "Active") {
          navigate("/driver", { replace: true });
        } else {
          navigate("/pending-approval", { replace: true });
        }
      } else {
        toast.success("Phone number verified successfully!");
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (!canResend) return;

    const nextOtp = createDemoOtp();
    setCurrentOtp(nextOtp);
    setOtpCreatedAt(Date.now());
    setOtp("");
    setResendTimer(DEMO_OTP_RESEND_SECONDS);
    setCanResend(false);
    toast.success(`New demo OTP: ${nextOtp}`, { duration: 10000 });
  };

  useEffect(() => {
    if (otp.length === 6) {
      void handleVerifyOTP();
    }
  }, [otp]);

  const backTarget = state.mode === "driver-forgot-password" ? "/driver-forgot-password" : state.mode === "google-phone" ? "/auth/phone" : state.mode === "register" ? "/register" : "/login";
  const isDriverRegistration = state.mode === "register" && state.role === "driver";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgba(75,15,20,0.08)] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center overflow-hidden w-12 h-12 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm">
              <img src={logoImg} alt="Arangkada Logo" className="w-full h-full object-contain p-1" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify Your Number</h1>
          <p className="text-gray-600 mt-2">
            {isDriverRegistration
              ? "Verify your phone number to submit your driver application."
              : `Enter the demo OTP for ${state.phoneNumber}`}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demo OTP Verification</CardTitle>
            <CardDescription>
              {isDriverRegistration
                ? "No SMS is sent yet. Use this demo code to finish driver phone verification."
                : "No SMS is sent yet. Use the demo code below for capstone testing."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="rounded-xl border border-[#4B0F14]/20 bg-[#4B0F14]/5 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Demo OTP Code</p>
                <p className="mt-1 text-3xl font-black tracking-[0.2em] text-[#4B0F14]">{currentOtp}</p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {loading && (
                <div className="text-center text-sm text-gray-600">
                  Verifying OTP...
                </div>
              )}

              <Button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6} className="w-full">
                Verify Number
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Need another demo code?</p>
                {canResend ? (
                  <Button
                    variant="link"
                    onClick={handleResendOTP}
                    className="text-[#4B0F14]"
                  >
                    Generate New OTP
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500">
                    Generate again in {resendTimer} seconds
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600 bg-[rgba(75,15,20,0.05)] p-4 rounded-lg">
                <p className="font-semibold">Demo mode:</p>
                <ul className="space-y-1">
                  <li>Use the displayed code to verify the phone number.</li>
                  <li>Later, this screen can be connected to Supabase SMS OTP.</li>
                  <li>The 60-second resend timer is kept to match real OTP behavior.</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(backTarget)}
              >
                Change Phone Number
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/onboarding")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Onboarding
          </button>
        </div>
      </div>
    </div>
  );
}
