import { useNavigate } from "react-router";
import { MapPin, Clock, Star, Zap, Users, User, Navigation2, ChevronRight } from "lucide-react";
import { useUser } from "../../context/UserContext";

const MAROON = "#4B0F14";
const GOLD = "#D4AF37";
const CREAM = "#FFF8E7";

export default function PassengerDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();

  const firstName = currentUser?.firstName || "Pasahero";
  const profilePhoto = currentUser?.profilePhoto;

  const quickDestinations = [
    { name: "PUP Sta. Mesa", icon: "🎓" },
    { name: "Divisoria", icon: "🛍️" },
    { name: "V. Mapa LRT", icon: "🚉" },
    { name: "Sta. Mesa Market", icon: "🏪" },
  ];

  const recentRides = [
    { pickup: "PUP Sta. Mesa", destination: "Divisoria", fare: 65, date: "Kahapon, 2:30 PM", rating: 5 },
    { pickup: "San Juan", destination: "PUP Sta. Mesa", fare: 40, date: "Lunes, 8:15 AM", rating: 4 },
  ];

  const promos = [
    { code: "RIDE20", label: "20% OFF", desc: "First shared ride" },
    { code: "STUDENT", label: "Beep 20%", desc: "Student discount" },
  ];

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>

      {/* Header */}
      <div
        className="px-5 pt-12 pb-8"
        style={{ background: `linear-gradient(160deg, ${MAROON} 0%, #6E171D 100%)` }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.3)" }}>
              <span style={{ fontSize: 16 }}>🛺</span>
            </div>
            <span style={{ color: CREAM, fontSize: 16, fontWeight: 900 }}>Arangkada</span>
          </div>
          <button
            onClick={() => navigate("/passenger/notifications")}
            className="h-10 w-10 rounded-full flex items-center justify-center relative"
            style={{ background: "rgba(255,248,231,0.15)" }}
          >
            <span style={{ fontSize: 18 }}>🔔</span>
            <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{ background: GOLD }} />
          </button>
        </div>

        {/* Greeting */}
        <div className="flex items-center gap-3 mb-5">
          {/* Avatar */}
          <div
            className="h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: "rgba(212,175,55,0.2)", border: "2px solid rgba(212,175,55,0.3)" }}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span style={{ color: GOLD, fontSize: 20, fontWeight: 800 }}>{firstName.charAt(0)}</span>
            )}
          </div>
          <div>
            <p style={{ color: "rgba(255,248,231,0.65)", fontSize: 13 }}>Magandang araw,</p>
            <p style={{ color: CREAM, fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{firstName}! 👋</p>
          </div>
        </div>

        {/* Book ride search bar */}
        <button
          onClick={() => navigate("/passenger/book")}
          className="w-full rounded-2xl p-4 flex items-center gap-3"
          style={{ background: CREAM, boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}
        >
          <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(75,15,20,0.08)" }}>
            <MapPin size={22} color={MAROON} />
          </div>
          <div className="flex-1 text-left">
            <p style={{ color: "#9a8a7a", fontSize: 12, fontWeight: 500 }}>Saan ka pupunta?</p>
            <p style={{ color: MAROON, fontSize: 15, fontWeight: 700, marginTop: 1 }}>I-book ang iyong sakay</p>
          </div>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: MAROON }}>
            <Navigation2 size={16} color={GOLD} />
          </div>
        </button>
      </div>

      <div className="px-5 pt-5 pb-36">

        {/* Solo / Shared ride type */}
        <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Uri ng Biyahe</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Solo */}
          <button
            onClick={() => navigate("/passenger/book", { state: { rideType: "solo" } })}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl"
            style={{ background: "#ffffff", border: `2px solid ${MAROON}`, boxShadow: "0 2px 8px rgba(75,15,20,0.1)" }}
          >
            <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(75,15,20,0.08)" }}>
              <User size={22} color={MAROON} />
            </div>
            <div className="text-center">
              <p style={{ color: MAROON, fontSize: 14, fontWeight: 800 }}>Solo</p>
              <p style={{ color: "#7a6a5a", fontSize: 11, marginTop: 1 }}>Pribadong sakay</p>
              <p style={{ color: "#9a8a7a", fontSize: 10 }}>Buong bayad</p>
            </div>
          </button>

          {/* Shared */}
          <button
            onClick={() => navigate("/passenger/book", { state: { rideType: "shared" } })}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl"
            style={{ background: "rgba(75,15,20,0.05)", border: `2px solid rgba(212,175,55,0.5)`, boxShadow: "0 2px 8px rgba(212,175,55,0.15)" }}
          >
            <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
              <Users size={22} color={GOLD} />
            </div>
            <div className="text-center">
              <p style={{ color: MAROON, fontSize: 14, fontWeight: 800 }}>Shared</p>
              <p style={{ color: "#7a6a5a", fontSize: 11, marginTop: 1 }}>Ibahagi ang sakay</p>
              <p style={{ color: "#2E7D32", fontSize: 10, fontWeight: 700 }}>30% mas mura!</p>
            </div>
          </button>
        </div>

        {/* Quick Destinations */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700 }}>Mabilis na Destinasyon</p>
            <button onClick={() => navigate("/passenger/book")} style={{ color: MAROON, fontSize: 12, fontWeight: 600 }}>
              I-book →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickDestinations.map((dest) => (
              <button
                key={dest.name}
                onClick={() => navigate("/passenger/book")}
                className="flex items-center gap-3 p-3.5 rounded-xl text-left"
                style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.1)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <span style={{ fontSize: 20 }}>{dest.icon}</span>
                <p style={{ color: "#1E1E1E", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{dest.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Promos */}
        <div className="mb-5">
          <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Mga Promo</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {promos.map((promo) => (
              <div
                key={promo.code}
                className="flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: MAROON, minWidth: 160, boxShadow: "0 4px 12px rgba(75,15,20,0.25)" }}
              >
                <div>
                  <div className="rounded-lg px-2 py-0.5 mb-1 inline-block" style={{ background: GOLD }}>
                    <p style={{ color: MAROON, fontSize: 11, fontWeight: 800 }}>{promo.label}</p>
                  </div>
                  <p style={{ color: CREAM, fontSize: 12, fontWeight: 700 }}>{promo.code}</p>
                  <p style={{ color: "rgba(255,248,231,0.65)", fontSize: 11 }}>{promo.desc}</p>
                </div>
                <Zap size={28} color="rgba(212,175,55,0.3)" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent rides */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 700 }}>Nakaraang Biyahe</p>
            <button onClick={() => navigate("/passenger/history")} style={{ color: MAROON, fontSize: 12, fontWeight: 600 }}>
              Tingnan lahat →
            </button>
          </div>
          <div className="space-y-2.5">
            {recentRides.map((ride, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl flex items-center gap-3"
                style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(75,15,20,0.06)" }}>
                  <span style={{ fontSize: 20 }}>🛺</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p style={{ color: "#1E1E1E", fontSize: 13, fontWeight: 700 }} className="truncate">{ride.pickup}</p>
                    <span style={{ color: "#9a8a7a", fontSize: 10 }}>→</span>
                    <p style={{ color: "#1E1E1E", fontSize: 13, fontWeight: 700 }} className="truncate">{ride.destination}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p style={{ color: "#9a8a7a", fontSize: 11 }}>{ride.date}</p>
                    <span style={{ color: GOLD, fontSize: 11 }}>{"★".repeat(ride.rating)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p style={{ color: MAROON, fontSize: 16, fontWeight: 800 }}>₱{ride.fare}</p>
                  <button
                    style={{ color: MAROON, fontSize: 11, fontWeight: 600 }}
                    onClick={() => navigate("/passenger/book")}
                  >
                    Ulit →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety card */}
        <div
          className="p-4 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(75,15,20,0.05)", border: "1.5px solid rgba(75,15,20,0.12)" }}
        >
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <p style={{ color: MAROON, fontSize: 13, fontWeight: 700 }}>Safety First</p>
            <p style={{ color: "#7a6a5a", fontSize: 12, lineHeight: 1.4 }}>
              Lahat ng driver ay na-verify. May emergency button sa tracking page.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
