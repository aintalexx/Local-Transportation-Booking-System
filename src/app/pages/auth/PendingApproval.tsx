import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Clock, CheckCircle, Phone, ArrowLeft, AlertTriangle, XCircle, LogOut, RefreshCw } from "lucide-react";
import { useUser } from "../../context/UserContext";
import logoImg from "../../../imports/logo.png";
import { getSupabaseDriverByPhone } from "../../utils/supabaseDrivers";
import { findUser } from "../../utils/userDatabase";
import { formatPHPhoneInput } from "../../utils/validators";
import { toast } from "sonner";

export default function PendingApproval() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const approvalStatus = user?.approvalStatus || "pending";
  const accountStatus = user?.accountStatus || "Active";

  // Auto-refresh approval status every 10 seconds
  useEffect(() => {
    if (!user || user.role !== "driver") return;

    const checkApprovalStatus = async () => {
      setIsChecking(true);
      try {
        // Check Supabase first
        const normalizedPhone = formatPHPhoneInput(user.phoneNumber);
        let dbDriver = await getSupabaseDriverByPhone(normalizedPhone);

        // Fallback to local database
        if (!dbDriver) {
          const localDriver = findUser(normalizedPhone);
          if (localDriver && localDriver.role === "driver") {
            dbDriver = {
              approval_status: localDriver.approvalStatus,
              account_status: localDriver.accountStatus || "Active",
            } as any;
          }
        }

        if (!dbDriver) {
          setIsChecking(false);
          setLastCheck(new Date());
          return;
        }

        setLastCheck(new Date());

        // If driver is now approved, redirect to driver dashboard
        if (dbDriver.approval_status === "approved" && dbDriver.account_status === "Active") {
          const updatedUser = { ...user, approvalStatus: "approved", accountStatus: "Active" };
          setUser(updatedUser);
          toast.success("🎉 Your account has been approved! Welcome aboard!");
          navigate("/driver", { replace: true });
          return;
        }

        // If driver is rejected, show rejection message
        if (dbDriver.approval_status === "rejected") {
          const updatedUser = { ...user, approvalStatus: "rejected" };
          setUser(updatedUser);
          toast.error("Your application was rejected. Please contact support for more information.");
          return;
        }

        // If account is blocked/archived, show that status
        if (dbDriver.account_status === "Blocked" || dbDriver.account_status === "Archived" || dbDriver.account_status === "Suspended") {
          const updatedUser = { ...user, accountStatus: dbDriver.account_status };
          setUser(updatedUser);
          return;
        }

        // Still pending, update UI to show we just checked
        setIsChecking(false);
      } catch (error) {
        console.info("Error checking approval status:", error);
        setIsChecking(false);
      }
    };

    // Check immediately on mount
    void checkApprovalStatus();

    // Then check every 10 seconds
    const interval = setInterval(() => {
      void checkApprovalStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [user, setUser, navigate]);

  const handleLogout = () => {
    setUser(null);
    navigate("/login", { replace: true });
  };

  // Determine status configurations
  let title = "Application Submitted!";
  let subtitle = "Your driver account has been received and is now under review by our admin team.";
  let IconComponent = Clock;
  let iconColor = "#D4AF37";
  let iconBg = "rgba(212,175,55,0.12)";
  let iconBorder = "2px solid rgba(212,175,55,0.3)";

  let steps = [
    { icon: CheckCircle, label: "Phone verification complete", done: true },
    { icon: Clock, label: "Admin review (1–2 business days)", done: false },
    { icon: Phone, label: "You'll be notified once approved", done: false },
  ];

  let infoTitle = "💡 What happens next?";
  let infoItems = [
    "Our admin team will verify your submitted documents.",
    "Your driver's license and plate number will be reviewed.",
    "Once approved, you can log in and start accepting rides.",
    "If rejected, you will be notified with the reason.",
  ];

  if (accountStatus === "Blocked" || accountStatus === "Archived" || accountStatus === "Suspended") {
    title = `Account ${accountStatus}!`;
    subtitle = `Your driver account has been ${accountStatus.toLowerCase()} by the administration.`;
    IconComponent = AlertTriangle;
    iconColor = "#C62828";
    iconBg = "rgba(198,40,40,0.12)";
    iconBorder = "2px solid rgba(198,40,40,0.3)";

    steps = [
      { icon: CheckCircle, label: "Account registered", done: true },
      { icon: AlertTriangle, label: `Account status: ${accountStatus}`, done: false },
    ];

    infoTitle = "⚠️ Next Steps";
    infoItems = [
      "Contact support at support@arangkada.ph to inquire about your status.",
      "Provide your registered phone number when sending support requests.",
      "Review the Terms and Conditions of Arangkada Sta. Mesa.",
    ];
  } else if (approvalStatus === "rejected") {
    title = "Application Rejected";
    subtitle = "Unfortunately, your driver application has been rejected after review.";
    IconComponent = XCircle;
    iconColor = "#C62828";
    iconBg = "rgba(198,40,40,0.12)";
    iconBorder = "2px solid rgba(198,40,40,0.3)";

    steps = [
      { icon: CheckCircle, label: "Phone verification complete", done: true },
      { icon: XCircle, label: "Admin review: Rejected", done: false },
    ];

    infoTitle = "📋 Feedback & Re-application";
    infoItems = [
      "Common reasons for rejection include invalid, blurry, or missing document photos.",
      "Ensure your plate number and license details match the uploaded documents.",
      "You can contact support at support@arangkada.ph for specific details.",
    ];
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8E7" }}>
      {/* Maroon header */}
      <div
        className="px-5 pt-12 pb-16"
        style={{ background: "linear-gradient(160deg, #4B0F14 0%, #6E171D 100%)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ background: "white", border: "1px solid rgba(212,175,55,0.3)" }}
          >
            <img src={logoImg} alt="Arangkada Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p style={{ color: "#FFF8E7", fontSize: 16, fontWeight: 900, lineHeight: 1 }}>Arangkada</p>
            <p style={{ color: "#D4AF37", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Sta. Mesa</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-10">
        {/* Main card */}
        <div
          className="rounded-3xl p-6 mb-4"
          style={{ background: "#ffffff", boxShadow: "0 8px 32px rgba(75,15,20,0.12)", border: "1.5px solid rgba(75,15,20,0.08)" }}
        >
          {/* Status icon */}
          <div className="flex justify-center mb-5">
            <div
              className="h-20 w-20 rounded-3xl flex items-center justify-center"
              style={{ background: iconBg, border: iconBorder }}
            >
              <IconComponent size={36} color={iconColor} />
            </div>
          </div>

          <h1 style={{ color: "#4B0F14", fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 8, lineHeight: 1.2 }}>
            {title}
          </h1>
          <p style={{ color: "#7a6a5a", fontSize: 14, textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
            {subtitle}
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: step.done ? "rgba(46,125,50,0.07)" : "rgba(75,15,20,0.04)" }}>
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: step.done ? "rgba(46,125,50,0.12)" : "rgba(212,175,55,0.12)" }}
                >
                  <step.icon size={18} color={step.done ? "#2E7D32" : (step.icon === XCircle || step.icon === AlertTriangle ? "#C62828" : "#B8860B")} />
                </div>
                <p style={{ color: step.done ? "#2E7D32" : "#1E1E1E", fontSize: 14, fontWeight: step.done ? 700 : 500 }}>
                  {step.label}
                </p>
                {step.done && (
                  <span className="ml-auto" style={{ color: "#2E7D32", fontSize: 12, fontWeight: 700 }}>✓ Done</span>
                )}
              </div>
            ))}
          </div>

          {/* Auto-check status indicator */}
          {user?.role === "driver" && (
            <div
              className="p-3 rounded-2xl mb-4 flex items-center justify-between"
              style={{ background: "rgba(46,125,50,0.08)", border: "1.5px solid rgba(46,125,50,0.25)" }}
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={14} color={isChecking ? "#2E7D32" : "#9a8a7a"} className={isChecking ? "animate-spin" : ""} />
                <span style={{ color: "#2E7D32", fontSize: 12, fontWeight: 600 }}>
                  {isChecking ? "Checking approval status..." : (lastCheck ? `Last checked: ${lastCheck.toLocaleTimeString()}` : "Auto-checking every 10 seconds")}
                </span>
              </div>
            </div>
          )}

          {/* Info box */}
          <div
            className="p-4 rounded-2xl mb-2"
            style={{ background: "rgba(212,175,55,0.08)", border: "1.5px solid rgba(212,175,55,0.25)" }}
          >
            <p style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{infoTitle}</p>
            <ul className="space-y-1.5">
              {infoItems.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span style={{ color: "#D4AF37", fontSize: 12, marginTop: 1 }}>•</span>
                  <span style={{ color: "#7a6a5a", fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleLogout}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 mb-3"
          style={{
            background: "linear-gradient(135deg, #4B0F14, #6E171D)",
            boxShadow: "0 6px 20px rgba(75,15,20,0.3)",
          }}
        >
          <LogOut size={18} color="#D4AF37" />
          <span style={{ color: "#D4AF37", fontSize: 16, fontWeight: 800 }}>Sign Out</span>
        </button>

        <button
          onClick={() => navigate("/onboarding")}
          className="w-full h-12 rounded-2xl flex items-center justify-center gap-2"
          style={{ background: "transparent" }}
        >
          <ArrowLeft size={16} color="#9a8a7a" />
          <span style={{ color: "#9a8a7a", fontSize: 14, fontWeight: 600 }}>Back to Onboarding</span>
        </button>
      </div>
    </div>
  );
}
