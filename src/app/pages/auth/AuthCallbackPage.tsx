import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Navigation } from "lucide-react";
import { getSupabaseConfigMessage, supabase } from "../../lib/supabase";
import { useUser } from "../../context/UserContext";
import {
  clearPendingGoogleRole,
  createLocalUserFromGoogle,
  getPendingGoogleRole,
} from "../../utils/supabaseAuth";
import { syncSupabaseProfile } from "../../utils/supabaseProfiles";
import { formatPHPhoneInput, validatePHPhone } from "../../utils/validators";
import { getRoleHomePath } from "../../utils/roleRouting";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [message, setMessage] = useState("Finishing Google sign in...");
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    const completeGoogleSignIn = async () => {
      if (hasHandledCallback.current) return;
      hasHandledCallback.current = true;

      if (!supabase) {
        toast.error(getSupabaseConfigMessage());
        navigate("/login", { replace: true });
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          setMessage("Verifying your Google account...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const supabaseUser = data.session?.user;
        if (!supabaseUser) {
          throw new Error("Google sign in did not return a user session.");
        }

        const role = getPendingGoogleRole();
        const appUser = createLocalUserFromGoogle(supabaseUser, role);

        clearPendingGoogleRole();
        setUser(appUser);
        toast.success("Google account connected successfully!");

        const phoneCheck = validatePHPhone(formatPHPhoneInput(appUser.phoneNumber || ""));
        if (appUser.role !== "admin" && !phoneCheck.valid) {
          setMessage("Add your phone number to finish registration...");
          navigate("/auth/phone", { replace: true });
          return;
        }

        await syncSupabaseProfile(appUser);
        setMessage("Redirecting to your account...");
        window.setTimeout(() => {
          window.location.replace(getRoleHomePath(appUser));
        }, 250);
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Google sign in failed.";
        const errorMessage = rawMessage.toLowerCase().includes("code verifier")
          ? "Google sign in expired or opened in a different browser. Please go back to Login and click Continue with Google again in the same browser tab."
          : rawMessage;
        toast.error(errorMessage);
        setMessage("Returning to login...");
        navigate("/login", { replace: true });
      }
    };

    completeGoogleSignIn();
  }, [navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8E7] to-white p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 text-center shadow-sm">
        <Navigation className="mx-auto mb-4 h-10 w-10 text-[#4B0F14]" />
        <h1 className="text-xl font-bold text-gray-900">Google Sign In</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
