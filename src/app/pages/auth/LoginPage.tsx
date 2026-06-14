import { useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { User, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { authenticateUser, findUser } from "../../utils/userDatabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [usernameOrPhone, setUsernameOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (!usernameOrPhone.trim()) { toast.error("Please enter your username or phone number"); return; }
    if (!password) { toast.error("Please enter your password"); return; }
    if (!agreedToTerms) { toast.error("You must accept the Terms and Privacy Policy"); return; }

    setLoading(true);
    try {
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
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
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
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>Username or Phone Number</label>
            <div className="relative">
              <User size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter username or phone number"
                value={usernameOrPhone}
                onChange={e => setUsernameOrPhone(e.target.value)}
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
                className="w-full pl-11 pr-12 rounded-2xl outline-none"
                style={{ height: 52, background: "#ffffff", border: showValidation && !password ? "2px solid #C62828" : "2px solid rgba(75,15,20,0.12)", color: "#1E1E1E", fontSize: 15 }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff size={18} color="#9a8a7a" /> : <Eye size={18} color="#9a8a7a" />}
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: showValidation && !agreedToTerms ? "rgba(198,40,40,0.06)" : "rgba(75,15,20,0.04)", border: showValidation && !agreedToTerms ? "1.5px solid rgba(198,40,40,0.3)" : "1.5px solid transparent" }}>
            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={v => setAgreedToTerms(v as boolean)} className="mt-0.5" />
            <label htmlFor="terms" className="cursor-pointer" style={{ fontSize: 13, color: "#7a6a5a", lineHeight: 1.5 }}>
              I agree to the{" "}
              <button type="button" onClick={() => navigate("/terms")} style={{ color: "#4B0F14", fontWeight: 700 }}>Terms & Conditions</button>{" "}
              and{" "}
              <button type="button" onClick={() => navigate("/privacy")} style={{ color: "#4B0F14", fontWeight: 700 }}>Privacy Policy</button>
            </label>
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

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(75,15,20,0.12)" }} />
            <span style={{ color: "#9a8a7a", fontSize: 12 }}>Or continue with</span>
            <div className="flex-1 h-px" style={{ background: "rgba(75,15,20,0.12)" }} />
          </div>

          {/* Google */}
          <button type="button" onClick={() => toast.info("Google Sign-In coming soon!")} className="w-full h-14 rounded-2xl flex items-center justify-center gap-3" style={{ background: "#ffffff", border: "2px solid rgba(75,15,20,0.12)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 600 }}>Sign in with Google</span>
          </button>
        </form>

        <p className="text-center mt-6" style={{ color: "#7a6a5a", fontSize: 14 }}>
          Don't have an account?{" "}
          <button onClick={() => navigate("/register")} style={{ color: "#4B0F14", fontWeight: 800 }}>Sign up here</button>
        </p>
      </div>
    </div>
  );
}
