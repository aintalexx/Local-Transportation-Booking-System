import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Navigation } from "lucide-react";
import { getSupabaseConfigMessage, supabase } from "../../lib/supabase";
import { useUser } from "../../context/UserContext";
import {
  clearPendingGoogleRole,
  createLocalUserFromGoogle,
  createLocalUserFromSupabaseUser,
  getPendingGoogleRole,
  hasPendingGoogleRole,
} from "../../utils/supabaseAuth";
import { syncSupabaseProfile } from "../../utils/supabaseProfiles";
import { formatPHPhoneInput, validatePHPhone } from "../../utils/validators";
import { getRoleHomePath } from "../../utils/roleRouting";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [message, setMessage] = useState("Finishing account verification...");
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    const completeAuthCallback = async () => {
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
        const isGoogleCallback = hasPendingGoogleRole();

        if (code) {
          setMessage(isGoogleCallback ? "Verifying your Google account..." : "Confirming your email...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const supabaseUser = data.session?.user;
        if (!supabaseUser) {
          throw new Error("Account verification did not return a user session.");
        }

        const appUser = isGoogleCallback
          ? await createLocalUserFromGoogle(supabaseUser, getPendingGoogleRole())
          : await createLocalUserFromSupabaseUser(supabaseUser);

        clearPendingGoogleRole();
        setUser(appUser);
        toast.success(isGoogleCallback ? "Google account connected successfully!" : "Email confirmed successfully!");

        // Ensure passenger record is created/updated in Supabase immediately
        await syncSupabaseProfile(appUser);

        const phoneCheck = validatePHPhone(formatPHPhoneInput(appUser.phoneNumber || ""));
        if (appUser.role !== "admin" && !phoneCheck.valid) {
          setMessage("Add your phone number to finish registration...");
          navigate("/auth/phone", { replace: true });
          return;
        }

        setMessage("Redirecting to your account...");
        window.setTimeout(() => {
          window.location.replace(getRoleHomePath(appUser));
        }, 250);
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Account verification failed.";
        const errorMessage = rawMessage.toLowerCase().includes("code verifier")
          ? "Verification expired or opened in a different browser. Please start the sign-in or email confirmation flow again in the same browser tab."
          : rawMessage;
        toast.error(errorMessage);
        setMessage("Returning to login...");
        navigate("/login", { replace: true });
      }
    };

    completeAuthCallback();
  }, [navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FFF8E7] to-white p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 text-center shadow-sm">
        <Navigation className="mx-auto mb-4 h-10 w-10 text-[#4B0F14]" />
        <h1 className="text-xl font-bold text-gray-900">Account Verification</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
