import { useNavigate } from "react-router";
import { Clock, CheckCircle, Phone, ArrowLeft } from "lucide-react";

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8E7" }}>
      {/* Maroon header */}
      <div
        className="px-5 pt-12 pb-16"
        style={{ background: "linear-gradient(160deg, #4B0F14 0%, #6E171D 100%)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.3)" }}
          >
            <span style={{ fontSize: 20 }}>🛺</span>
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
          {/* Pending icon */}
          <div className="flex justify-center mb-5">
            <div
              className="h-20 w-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.12)", border: "2px solid rgba(212,175,55,0.3)" }}
            >
              <Clock size={36} color="#D4AF37" />
            </div>
          </div>

          <h1 style={{ color: "#4B0F14", fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 8, lineHeight: 1.2 }}>
            Application Submitted!
          </h1>
          <p style={{ color: "#7a6a5a", fontSize: 14, textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
            Your driver account has been received and is now under review by our admin team.
          </p>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {[
              { icon: CheckCircle, label: "Registration complete", done: true },
              { icon: Clock, label: "Admin review (1–2 business days)", done: false },
              { icon: Phone, label: "You'll be notified once approved", done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: step.done ? "rgba(46,125,50,0.07)" : "rgba(75,15,20,0.04)" }}>
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: step.done ? "rgba(46,125,50,0.12)" : "rgba(212,175,55,0.12)" }}
                >
                  <step.icon size={18} color={step.done ? "#2E7D32" : "#B8860B"} />
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

          {/* Info box */}
          <div
            className="p-4 rounded-2xl mb-2"
            style={{ background: "rgba(212,175,55,0.08)", border: "1.5px solid rgba(212,175,55,0.25)" }}
          >
            <p style={{ color: "#4B0F14", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💡 What happens next?</p>
            <ul className="space-y-1.5">
              {[
                "Our admin team will verify your submitted documents.",
                "Your driver's license and plate number will be reviewed.",
                "Once approved, you can log in and start accepting rides.",
                "If rejected, you will be notified with the reason.",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span style={{ color: "#D4AF37", fontSize: 12, marginTop: 1 }}>•</span>
                  <span style={{ color: "#7a6a5a", fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sign in button */}
        <button
          onClick={() => navigate("/login")}
          className="w-full h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{
            background: "linear-gradient(135deg, #4B0F14, #6E171D)",
            boxShadow: "0 6px 20px rgba(75,15,20,0.3)",
          }}
        >
          <span style={{ color: "#D4AF37", fontSize: 16, fontWeight: 800 }}>Go to Sign In</span>
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full h-12 rounded-2xl flex items-center justify-center gap-2"
          style={{ background: "transparent" }}
        >
          <ArrowLeft size={16} color="#9a8a7a" />
          <span style={{ color: "#9a8a7a", fontSize: 14, fontWeight: 600 }}>Back to Home</span>
        </button>
      </div>
    </div>
  );
}
