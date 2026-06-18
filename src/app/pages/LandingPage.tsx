import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * LandingPage now serves as a router/redirector.
 * It bypasses the old landing page content and directs users to Onboarding
 * if they haven't completed it, or Login if they have.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const completed = localStorage.getItem("arangkada_onboarding_completed") === "true";
    if (!completed) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <span className="text-4xl mb-4">🛺</span>
        <p className="text-[#4B0F14] font-black tracking-widest text-lg">ARANGKADA</p>
      </div>
    </div>
  );
}
