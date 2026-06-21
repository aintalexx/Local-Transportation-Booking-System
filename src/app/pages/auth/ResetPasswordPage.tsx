import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import logoImg from "../../../imports/logo.png";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";
import { DEMO_OTP_RESEND_SECONDS, createDemoOtp } from "../../utils/demoOtp";
import { resetLocalUserPassword, updateUser, type UserData } from "../../utils/userDatabase";
import { prepareSupabasePasswordRecovery, updateSupabasePassword } from "../../utils/supabaseAuth";
import { updateSupabaseDriverPasswordByPhone } from "../../utils/supabaseDrivers";
import { validatePassword } from "../../utils/validators";

const RESET_TOKEN_EXPIRY_MS = 3 * 60 * 1000;

type ResetRouteState = {
  mode?: "local" | "mobile-reset";
  role?: "passenger" | "driver";
  identifier?: string;
  phoneNumber?: string;
  accountLabel?: string;
  generatedOtp?: string;
  otpVerified?: boolean;
  resetStartedAt?: number;
  userData?: Partial<UserData>;
};

function formatResetTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildRecoveredLocalUser(state: ResetRouteState, password: string): UserData | null {
  if (!state.userData && !state.phoneNumber) return null;

  const role = state.role || state.userData?.role || "passenger";
  const phoneDigits = String(state.phoneNumber || state.userData?.phoneNumber || "").replace(/\D/g, "");
  const username = state.userData?.username || `${role}_${phoneDigits || Date.now()}`;

  return {
    username,
    password,
    phoneNumber: state.phoneNumber || state.userData?.phoneNumber || "",
    surname: state.userData?.surname || "",
    firstName: state.userData?.firstName || "",
    middleName: state.userData?.middleName || "",
    suffix: state.userData?.suffix || "",
    email: state.userData?.email || "",
    emailConfirmed: true,
    birthdate: state.userData?.birthdate || "",
    role,
    guardianName: state.userData?.guardianName || "",
    guardianPhone: state.userData?.guardianPhone || "",
    rating: state.userData?.rating || 5,
    totalTrips: state.userData?.totalTrips || 0,
    totalEarnings: state.userData?.totalEarnings || 0,
    vehicleType: state.userData?.vehicleType || "",
    plateNumber: state.userData?.plateNumber || "",
    driverLicensePhoto: state.userData?.driverLicensePhoto || "",
    licenseNumber: state.userData?.licenseNumber || "",
    orCrPhoto: state.userData?.orCrPhoto || "",
    validIdPhoto: state.userData?.validIdPhoto || "",
    clearancePhoto: state.userData?.clearancePhoto || "",
    vehiclePhoto: state.userData?.vehiclePhoto || "",
    vehicleColor: state.userData?.vehicleColor || "",
    memberSince: state.userData?.memberSince || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: state.userData?.approvalStatus || (role === "driver" ? "pending" : "approved"),
    profilePhoto: state.userData?.profilePhoto || "",
    registrationDate: state.userData?.registrationDate || new Date().toISOString(),
    accountStatus: state.userData?.accountStatus || "Active",
    supabaseId: state.userData?.supabaseId,
    displayName: state.userData?.displayName,
  };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ResetRouteState;
  const isLocalReset = state.mode === "local" && Boolean(state.identifier);
  const isMobileReset = state.mode === "mobile-reset" && Boolean(state.otpVerified) && Boolean(state.identifier || state.phoneNumber);
  const hasSupabaseRecoveryParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return Boolean(params.get("code") || hash.get("access_token") || hash.get("type") === "recovery");
  }, []);

  const [otp, setOtp] = useState("");
  const [currentOtp, setCurrentOtp] = useState(state.generatedOtp || createDemoOtp());
  const [otpCreatedAt, setOtpCreatedAt] = useState(Date.now());
  const [resendTimer, setResendTimer] = useState(DEMO_OTP_RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparingRecovery, setPreparingRecovery] = useState(!isLocalReset && !isMobileReset);
  const [resetTimeLeftMs, setResetTimeLeftMs] = useState(RESET_TOKEN_EXPIRY_MS);
  const resetStartedAt = useMemo(() => state.resetStartedAt || Date.now(), []);
  const isTimedReset = isMobileReset || isLocalReset;
  const resetExpired = isTimedReset && resetTimeLeftMs <= 0;
  const recoveryStartPath = state.role === "driver" ? "/driver-forgot-password" : "/forgot-password";

  useEffect(() => {
    if (isMobileReset) {
      return;
    }

    if (isLocalReset) {
      toast.success(`Demo recovery OTP: ${currentOtp}`, { duration: 10000 });
      return;
    }

    if (!hasSupabaseRecoveryParams) {
      toast.error("Password reset session is missing. Please start recovery again.");
      navigate("/forgot-password", { replace: true });
      return;
    }

    prepareSupabasePasswordRecovery(window.location.href)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Password reset session expired.";
        toast.error(message);
        navigate("/forgot-password", { replace: true });
      })
      .finally(() => setPreparingRecovery(false));
  }, []);

  useEffect(() => {
    if (!isTimedReset) return;

    const updateRemainingTime = () => {
      const timeLeft = RESET_TOKEN_EXPIRY_MS - (Date.now() - resetStartedAt);
      setResetTimeLeftMs(Math.max(0, timeLeft));

      if (timeLeft <= 0) {
        toast.error("Password reset token expired. Please start forgot password again.");
        navigate(recoveryStartPath, { replace: true });
      }
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(timer);
  }, [isTimedReset, navigate, recoveryStartPath, resetStartedAt]);

  useEffect(() => {
    if (!isLocalReset || canResend) return;

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
  }, [canResend, isLocalReset]);

  const handleResend = () => {
    if (!canResend) return;
    const nextOtp = createDemoOtp();
    setCurrentOtp(nextOtp);
    setOtpCreatedAt(Date.now());
    setOtp("");
    setCanResend(false);
    setResendTimer(DEMO_OTP_RESEND_SECONDS);
    toast.success(`New recovery OTP: ${nextOtp}`, { duration: 10000 });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      toast.error(passwordCheck.message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (resetExpired) {
      toast.error("Password reset token expired. Please start forgot password again.");
      navigate(recoveryStartPath, { replace: true });
      return;
    }

    if (isLocalReset) {
      if (otp.length !== 6) {
        toast.error("Please enter the 6-digit recovery OTP.");
        return;
      }

      if (Date.now() - otpCreatedAt > DEMO_OTP_RESEND_SECONDS * 1000) {
        toast.error("Recovery OTP expired. Please generate a new code.");
        setCanResend(true);
        setResendTimer(0);
        return;
      }

      if (otp !== currentOtp) {
        toast.error("Invalid recovery OTP.");
        setOtp("");
        return;
      }
    }

    setLoading(true);
    try {
      if (isMobileReset) {
        const identifier = state.identifier || state.phoneNumber || "";
        const result = resetLocalUserPassword(identifier, password);

        if (!result.success && result.message !== "Account not found.") {
          toast.error(result.message);
          return;
        }

        const driverUpdated = state.role === "driver" && state.phoneNumber
          ? await updateSupabaseDriverPasswordByPhone(state.phoneNumber, password)
          : false;

        if (!result.success && !driverUpdated) {
          if (result.message === "Account not found." && state.userData) {
            const recoveredUser = buildRecoveredLocalUser(state, password);
            const saved = recoveredUser ? updateUser(recoveredUser.username, recoveredUser) : false;
            if (!saved) {
              toast.error(result.message);
              return;
            }
          } else {
            toast.error(result.message);
            return;
          }
        }
      } else if (isLocalReset) {
        const result = resetLocalUserPassword(state.identifier || "", password);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
      } else {
        await updateSupabasePassword(password);
      }

      toast.success("Password reset successfully. Please login again.");
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Password reset failed.";
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
        <h1 style={{ color: "#FFF8E7", fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>Set new password</h1>
        <p style={{ color: "rgba(255,248,231,0.68)", fontSize: 14, marginTop: 6 }}>
          {isMobileReset || isLocalReset ? `Recovering ${state.accountLabel || "your account"}` : "Complete your Supabase password reset."}
        </p>
      </div>

      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          {preparingRecovery && (
            <div className="rounded-2xl border border-[#4B0F14]/12 bg-white p-4 text-center text-sm font-semibold text-[#4B0F14]">
              Preparing password reset...
            </div>
          )}

          {isTimedReset && (
            <div className="rounded-2xl border border-[#4B0F14]/12 bg-white p-4 text-sm leading-6 text-[#4B0F14]">
              <p className="font-bold">Reset token expires in {formatResetTime(resetTimeLeftMs)}</p>
              <p className="text-xs text-[#7a6a5a]">Finish changing your password within 3 minutes.</p>
            </div>
          )}

          {isLocalReset && (
            <div className="rounded-2xl border border-[#4B0F14]/12 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-[#4B0F14]">Recovery OTP</p>
              <div className="mb-4 rounded-xl bg-[#4B0F14]/5 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Demo Code</p>
                <p className="mt-1 text-2xl font-black tracking-[0.2em] text-[#4B0F14]">{currentOtp}</p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={loading}>
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
              <button type="button" onClick={handleResend} disabled={!canResend} className="mt-3 w-full text-sm font-bold text-[#4B0F14] disabled:text-gray-400">
                {canResend ? "Generate New OTP" : `Generate again in ${resendTimer} seconds`}
              </button>
            </div>
          )}

          <div className="space-y-3">
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700 }}>New Password</label>
            <div className="relative">
              <KeyRound size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-14 rounded-2xl border-2 bg-white pl-11 pr-12"
                placeholder="Enter new password"
                disabled={preparingRecovery}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 flex w-9 items-center justify-center">
                {showPassword ? <EyeOff size={18} color="#9a8a7a" /> : <Eye size={18} color="#9a8a7a" />}
              </button>
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-14 rounded-2xl border-2 bg-white"
              placeholder="Confirm new password"
              disabled={preparingRecovery}
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <Button type="submit" disabled={loading || preparingRecovery || resetExpired} className="h-14 w-full rounded-2xl bg-[#4B0F14] text-[#D4AF37] hover:bg-[#6E171D]">
            {loading ? "Saving password..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
