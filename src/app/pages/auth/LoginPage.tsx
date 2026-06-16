import { useState } from "react";
import { useNavigate } from "react-router";
import { User, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { authenticateUser, findUser } from "../../utils/userDatabase";
import { formatPHPhoneInput } from "../../utils/validators";
import { signInWithEmailPassword, signInWithGoogle } from "../../utils/supabaseAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [usernameOrPhone, setUsernameOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (!usernameOrPhone.trim()) { toast.error("Please enter your username or phone number"); return; }
    if (!password) { toast.error("Please enter your password"); return; }

    setLoading(true);
    try {
      if (usernameOrPhone.includes("@")) {
        const supabaseUser = await signInWithEmailPassword(usernameOrPhone, password);
        if (supabaseUser) {
          setUser(supabaseUser);
          toast.success("Login successful!");
          navigate(supabaseUser.role === "driver" ? "/driver" : "/passenger");
          return;
        }
      }

      await new Promise(r => setTimeout(r, 900));
      const user = authenticateUser(usernameOrPhone, password);
      if (!user) {
        const existing = findUser(usernameOrPhone);
        toast.error(existing ? "Incorrect password" : "Account not found. Please register first.");
        return;
      }
      if (user.role === "driver") {
        if (!user.approvalStatus || user.approvalStatus === "pending") {
          toast.error("Your driver account is pending admin approval.", { duration: 5000 });
          return;
        }
        if (user.approvalStatus === "rejected") {
          toast.error("Your driver application has been rejected. Contact support.", { duration: 5000 });
          return;
        }
      }
      setUser(user);
      toast.success("Login successful!");
      navigate(user.role === "driver" ? "/driver" : "/passenger");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle("passenger");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google login failed. Please try again.";
      toast.error(message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8E7" }}>
      {/* Maroon header */}
      <div className="px-5 pt-12 pb-10" style={{ background: "linear-gradient(160deg, #4B0F14 0%, #6E171D 100%)" }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 mb-6" style={{ color: "rgba(255,248,231,0.65)" }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: 14 }}>Back</span>
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(212,175,55,0.18)", border: "1.5px solid rgba(212,175,55,0.3)" }}>
            <span style={{ fontSize: 22 }}>🛺</span>
          </div>
          <div>
            <p style={{ color: "#FFF8E7", fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>Arangkada</p>
            <p style={{ color: "#D4AF37", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Sta. Mesa</p>
          </div>
        </div>
        <h1 style={{ color: "#FFF8E7", fontSize: 26, fontWeight: 800, marginTop: 20, lineHeight: 1.1 }}>Welcome back!</h1>
        <p style={{ color: "rgba(255,248,231,0.6)", fontSize: 14, marginTop: 4 }}>Sign in to your account</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username / Phone */}
          <div>
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Email, Username, or Phone Number</label>
            <div className="relative">
              <User size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter email, username, or phone number"
                value={usernameOrPhone}
                onChange={e => {
                  const value = e.target.value;
                  const phoneLike = /^[+\d\s()-]*$/.test(value);
                  setUsernameOrPhone(phoneLike ? formatPHPhoneInput(value) : value);
                }}
                className="w-full pl-11 pr-4 rounded-2xl outline-none"
                style={{ height: 52, background: "#ffffff", border: showValidation && !usernameOrPhone ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)", color: "#1E1E1E", fontSize: 15 }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Password</label>
            <div className="relative">
              <Lock size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-14 rounded-2xl outline-none"
                style={{ height: 52, background: "#ffffff", border: showValidation && !password ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)", color: "#1E1E1E", fontSize: 15 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-3 flex !h-full !min-h-0 !w-9 !min-w-0 items-center justify-center p-0"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} color="#9a8a7a" /> : <Eye size={18} color="#9a8a7a" />}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl flex items-center justify-center"
            style={{ background: loading ? "rgba(75,15,20,0.5)" : "linear-gradient(135deg, #4B0F14, #6E171D)", boxShadow: "0 6px 20px rgba(75,15,20,0.3)" }}
          >
            <span style={{ color: "#D4AF37", fontSize: 16, fontWeight: 800 }}>{loading ? "Logging in..." : "Login to Account"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgba(75,15,20,0.16)]" />
            <span style={{ color: "#7a6a5a", fontSize: 12, fontWeight: 700 }}>or</span>
            <div className="h-px flex-1 bg-[rgba(75,15,20,0.16)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 bg-white"
            style={{ borderColor: "rgba(75,15,20,0.12)", color: "#4B0F14", fontWeight: 800 }}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
              G
            </span>
            {googleLoading ? "Opening Google..." : "Continue with Google"}
          </button>

          <p className="text-center" style={{ color: "#7a6a5a", fontSize: 12, lineHeight: 1.5 }}>
            By signing in, you agree to the{" "}
            <button type="button" onClick={() => navigate("/terms")} style={{ color: "#4B0F14", fontWeight: 700 }}>Terms</button>{" "}
            and{" "}
            <button type="button" onClick={() => navigate("/privacy")} style={{ color: "#4B0F14", fontWeight: 700 }}>Privacy Policy</button>.
          </p>
        </form>

        <p className="text-center mt-6" style={{ color: "#7a6a5a", fontSize: 14 }}>
          Don't have an account?{" "}
          <button onClick={() => navigate("/register")} style={{ color: "#4B0F14", fontWeight: 800 }}>Sign up here</button>
        </p>
      </div>
    </div>
  );
}
