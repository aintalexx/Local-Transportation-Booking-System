import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Mail, Navigation, UserRound } from "lucide-react";
import { toast } from "sonner";
import logoImg from "../../../imports/logo.png";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { createDemoOtp } from "../../utils/demoOtp";
import { findUser } from "../../utils/userDatabase";
import { requestSupabasePasswordReset } from "../../utils/supabaseAuth";
import { formatPHPhoneInput, validateEmail } from "../../utils/validators";

function maskAccountTarget(value: string): string {
  if (!value.includes("@")) return value;
  const [name, domain] = value.split("@");
  const safeName = name.length <= 2 ? `${name[0] || "*"}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = identifier.trim();

    if (!value) {
      toast.error("Please enter your email, username, or phone number.");
      return;
    }

    setLoading(true);
    try {
      const user = findUser(value);
      if (user) {
        const generatedOtp = createDemoOtp();
        toast.success(`Demo recovery OTP: ${generatedOtp}`, { duration: 10000 });
        navigate("/reset-password", {
          state: {
            mode: "local",
            identifier: user.username,
            accountLabel: maskAccountTarget(user.email || user.phoneNumber || user.username),
            generatedOtp,
          },
        });
        return;
      }

      const emailCheck = validateEmail(value, true);
      if (!emailCheck.valid) {
        toast.error("Account not found. Try the email, username, or phone used during registration.");
        return;
      }

      await requestSupabasePasswordReset(value);
      toast.success("Password reset email sent. Please check your inbox.");
      navigate("/login", { replace: true });
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
          Reset access for passenger, driver, or admin accounts.
        </p>
      </div>

      <div className="flex-1 px-5 pt-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
              Email, Username, or Phone Number
            </label>
            <div className="relative">
              {identifier.includes("@") ? (
                <Mail size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              ) : (
                <UserRound size={16} color="#9a8a7a" className="absolute left-4 top-1/2 -translate-y-1/2" />
              )}
              <Input
                value={identifier}
                onChange={(event) => {
                  const value = event.target.value;
                  const phoneLike = /^[+\d\s()-]*$/.test(value);
                  setIdentifier(phoneLike ? formatPHPhoneInput(value) : value);
                }}
                className="h-14 rounded-2xl border-2 bg-white pl-11"
                placeholder="Enter account email, username, or 09 number"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-14 w-full rounded-2xl bg-[#4B0F14] text-[#D4AF37] hover:bg-[#6E171D]">
            {loading ? "Checking account..." : "Continue"}
          </Button>

          <p className="rounded-2xl border border-[#4B0F14]/10 bg-white p-4 text-sm leading-6 text-[#7a6a5a]">
            Local/demo accounts use a displayed OTP for capstone testing. Supabase email accounts receive a real reset email.
          </p>
        </form>
      </div>
    </div>
  );
}
