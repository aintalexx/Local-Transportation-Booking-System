import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff, KeyRound, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";
import { DEMO_OTP_RESEND_SECONDS, createDemoOtp } from "../../utils/demoOtp";
import { resetLocalUserPassword } from "../../utils/userDatabase";
import { prepareSupabasePasswordRecovery, updateSupabasePassword } from "../../utils/supabaseAuth";
import { validatePassword } from "../../utils/validators";

type ResetRouteState = {
  mode?: "local";
  identifier?: string;
  accountLabel?: string;
  generatedOtp?: string;
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ResetRouteState;
  const isLocalReset = state.mode === "local" && Boolean(state.identifier);
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
  const [preparingRecovery, setPreparingRecovery] = useState(!isLocalReset);

  useEffect(() => {
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
      if (isLocalReset) {
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
        <Navigation className="mb-4 h-11 w-11 text-[#D4AF37]" />
        <h1 style={{ color: "#FFF8E7", fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>Set new password</h1>
        <p style={{ color: "rgba(255,248,231,0.68)", fontSize: 14, marginTop: 6 }}>
          {isLocalReset ? `Recovering ${state.accountLabel || "your account"}` : "Complete your Supabase password reset."}
        </p>
      </div>

      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          {preparingRecovery && (
            <div className="rounded-2xl border border-[#4B0F14]/12 bg-white p-4 text-center text-sm font-semibold text-[#4B0F14]">
              Preparing password reset...
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
            <p className="text-xs leading-5 text-[#7a6a5a]">
              Use 8-30 characters with uppercase, lowercase, number, and special character.
            </p>
          </div>

          <Button type="submit" disabled={loading || preparingRecovery} className="h-14 w-full rounded-2xl bg-[#4B0F14] text-[#D4AF37] hover:bg-[#6E171D]">
            {loading ? "Saving password..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
