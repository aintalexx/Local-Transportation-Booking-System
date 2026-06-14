import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { MapPin, Search, X, ArrowLeft, User, Users, Navigation2, Tag, DollarSign, Locate, CreditCard } from "lucide-react";
import { toast } from "sonner";
import MapView from "../../components/MapView";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import { createBooking } from "../../utils/bookingDatabase";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogPortal,
} from "../../components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../components/ui/utils";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";

const MAROON = "#4B0F14";
const GOLD = "#D4AF37";
const CREAM = "#FFF8E7";

type RideType = "solo" | "shared";
type PassengerType = "regular" | "student" | "pwd";
type PaymentMethod = "cash" | "epayment";
type BookingStep = "destination" | "passenger_type" | "confirm";

interface Destination {
  id: string;
  name: string;
  area: string;
  emoji: string;
  basePrice: number;
  coords: { lat: number; lng: number };
}

interface PromoCode {
  code: string;
  description: string;
  discount: number;
}

const DESTINATIONS: Destination[] = [
  { id: "vmapa",     name: "V. Mapa LRT Station",          area: "Sta. Mesa",  emoji: "🚉", basePrice: 25,  coords: { lat: 14.5992, lng: 121.0083 } },
  { id: "market",    name: "Sta. Mesa Market",              area: "Sta. Mesa",  emoji: "🏪", basePrice: 20,  coords: { lat: 14.6042, lng: 121.0119 } },
  { id: "pureza",    name: "Pureza LRT Station",            area: "Sta. Mesa",  emoji: "🚉", basePrice: 30,  coords: { lat: 14.6099, lng: 121.0199 } },
  { id: "pup",       name: "PUP Main Gate",                 area: "Sta. Mesa",  emoji: "🎓", basePrice: 15,  coords: { lat: 14.5995, lng: 121.0114 } },
  { id: "blumen",    name: "Blumentritt Station",           area: "Manila",     emoji: "🚉", basePrice: 40,  coords: { lat: 14.6100, lng: 120.9850 } },
  { id: "nagtahan",  name: "Nagtahan Bridge",               area: "Manila",     emoji: "🌉", basePrice: 35,  coords: { lat: 14.5967, lng: 120.9981 } },
  { id: "pgh",       name: "Philippine General Hospital",   area: "Manila",     emoji: "🏥", basePrice: 60,  coords: { lat: 14.5768, lng: 121.0166 } },
  { id: "quiapo",    name: "Quiapo Church",                 area: "Manila",     emoji: "⛪", basePrice: 55,  coords: { lat: 14.5986, lng: 120.9842 } },
  { id: "divisoria", name: "Divisoria Market",              area: "Manila",     emoji: "🛍️", basePrice: 65,  coords: { lat: 14.6042, lng: 121.0196 } },
  { id: "sanjuan",   name: "San Juan City Hall",            area: "San Juan",   emoji: "🏛️", basePrice: 45,  coords: { lat: 14.6019, lng: 121.0355 } },
  { id: "ust",       name: "University of Santo Tomas",     area: "Sampaloc",   emoji: "🏫", basePrice: 50,  coords: { lat: 14.6093, lng: 120.9892 } },
  { id: "divisoriam",name: "Divisoria (Monumento side)",   area: "Caloocan",   emoji: "🛒", basePrice: 70,  coords: { lat: 14.6200, lng: 121.0000 } },
];

const AVAILABLE_PROMOS: PromoCode[] = [
  { code: "ARANGKADA",   description: "Welcome to Arangkada! 20% off",        discount: 20 },
  { code: "STAMESARIDE", description: "Sta. Mesa pride! 15% off your ride",   discount: 15 },
  { code: "PUPSAKAY",    description: "PUP x Arangkada — 12% off",            discount: 12 },
  { code: "SAKTOLANG",   description: "Sarap ng biyahe! 10% off",             discount: 10 },
  { code: "MAHAL23",     description: "Love your commute — ₱5 off",           discount: 5  },
  { code: "FLASH30",     description: "Flash promo! 30% off today only",       discount: 30 },
];

function calcFinalPrice(basePrice: number, rideType: RideType, passengerType: PassengerType, promo: PromoCode | null): number {
  let price = basePrice;
  // Shared base discount: 30%
  if (rideType === "shared") price *= 0.70;
  // Student or PWD discount: 10%
  if (passengerType === "student" || passengerType === "pwd") price *= 0.90;
  // Promo code
  if (promo) price *= (1 - promo.discount / 100);
  return Math.round(price);
}

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { setActiveBooking, refreshBooking } = useBooking();

  const initialRideType = (location.state?.rideType as RideType) || "solo";

  const [step, setStep] = useState<BookingStep>("destination");
  const [rideType, setRideType] = useState<RideType>(initialRideType);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Destination | null>(null);
  const [passengerType, setPassengerType] = useState<PassengerType>("regular");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [pickup, setPickup] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const filtered = DESTINATIONS.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.area.toLowerCase().includes(search.toLowerCase())
  );

  const finalPrice = selected ? calcFinalPrice(selected.basePrice, rideType, passengerType, appliedPromo) : 0;

  const discountBreakdown = () => {
    if (!selected) return [];
    const lines: { label: string; amount: string }[] = [];
    if (rideType === "shared") lines.push({ label: "Shared Ride", amount: "-30%" });
    if (passengerType === "student") lines.push({ label: "Student Discount", amount: "-10%" });
    if (passengerType === "pwd") lines.push({ label: "PWD Discount", amount: "-10%" });
    if (appliedPromo) lines.push({ label: `Promo (${appliedPromo.code})`, amount: `-${appliedPromo.discount}%` });
    return lines;
  };

  const handleUseCurrentLocation = () => {
    setIsLoadingLocation(true);
    if (!navigator.geolocation) { toast.info("Geolocation not supported"); setIsLoadingLocation(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
          const data = await res.json();
          const addr = data.display_name || "Current Location";
          setPickup(addr);
          setPickupCoords({ lat: latitude, lng: longitude, address: addr });
          toast.success("Using your current location");
        } catch {
          setPickupCoords({ lat: latitude, lng: longitude, address: "Current Location" });
          setPickup("Current Location");
        } finally { setIsLoadingLocation(false); }
      },
      () => { toast.error("Unable to get location"); setIsLoadingLocation(false); }
    );
  };

  const applyPromo = () => {
    const promo = AVAILABLE_PROMOS.find(p => p.code === promoCode.toUpperCase());
    if (promo) { setAppliedPromo(promo); toast.success(`Promo "${promo.code}" applied! ${promo.discount}% off`); setShowPromoInput(false); setPromoCode(""); }
    else toast.error("Invalid promo code");
  };

  const handleConfirm = async () => {
    if (!user || !selected) { toast.error("Missing booking info"); return; }
    if (!pickupCoords) { toast.error("Please set your pickup location"); return; }

    setBookingLoading(true);
    setShowConfirmDialog(false);

    try {
      const passengerName = `${user.firstName} ${user.middleName} ${user.surname}`.trim();
      const booking = createBooking({
        passengerUsername: user.username,
        passengerName,
        passengerPhone: user.phoneNumber,
        pickupLocation: pickupCoords,
        destination: { ...selected.coords, address: selected.name },
        distance: 3.0,
        basePrice: selected.basePrice,
        finalPrice,
        paymentMethod: paymentMethod === "epayment" ? "E-Payment" : "Cash",
        vehicleType: "Tricycle",
        rideType,
        discount: discountBreakdown().length > 0 ? {
          type: [rideType === "shared" ? "Shared" : "", passengerType !== "regular" ? passengerType.toUpperCase() : ""].filter(Boolean).join("+"),
          amount: Math.round((1 - finalPrice / selected.basePrice) * 100),
        } : undefined,
      });

      setActiveBooking(booking);
      refreshBooking();
      toast.success("Booking confirmed! Searching for nearby drivers...");
      navigate("/passenger/ongoing-booking");
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally { setBookingLoading(false); }
  };

  /* ─── STEP 1: DESTINATION SELECT ─── */
  if (step === "destination") {
    return (
      <div className="h-screen flex flex-col" style={{ background: CREAM }}>
        {/* Header */}
        <div className="px-5 pt-12 pb-5" style={{ background: `linear-gradient(160deg, ${MAROON} 0%, #6E171D 100%)` }}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/passenger")} className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,248,231,0.15)" }}>
              <ArrowLeft size={18} color="#FFF8E7" />
            </button>
            <div>
              <p style={{ color: "rgba(255,248,231,0.65)", fontSize: 12 }}>
                {rideType === "shared" ? "👥 Shared Ride" : "👤 Solo Ride"}
              </p>
              <p style={{ color: "#FFF8E7", fontSize: 17, fontWeight: 800, lineHeight: 1 }}>Pumili ng Destinasyon</p>
            </div>
          </div>

          {/* Ride type toggle */}
          <div className="flex gap-2 mb-4">
            {(["solo", "shared"] as RideType[]).map(rt => (
              <button key={rt} onClick={() => setRideType(rt)}
                className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5"
                style={{ background: rideType === rt ? "rgba(212,175,55,0.25)" : "rgba(255,248,231,0.1)", border: rideType === rt ? "1.5px solid rgba(212,175,55,0.5)" : "1.5px solid transparent" }}
              >
                {rt === "solo" ? <User size={14} color={rideType === rt ? GOLD : "rgba(255,248,231,0.5)"} /> : <Users size={14} color={rideType === rt ? GOLD : "rgba(255,248,231,0.5)"} />}
                <span style={{ color: rideType === rt ? GOLD : "rgba(255,248,231,0.5)", fontSize: 13, fontWeight: rideType === rt ? 700 : 500 }}>
                  {rt === "solo" ? "Solo" : "Shared (-30%)"}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} color="#9a8a7a" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Hanapin ang destinasyon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 rounded-2xl outline-none"
              style={{ height: 44, background: "#ffffff", fontSize: 14, color: "#1E1E1E" }}
            />
          </div>
        </div>

        {/* Destination grid */}
        <div className="flex-1 overflow-auto px-5 pt-4 pb-8">
          <p style={{ color: "#7a6a5a", fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Mga Sikat na Destinasyon
          </p>
          <div className="space-y-2.5">
            {filtered.map(dest => {
              const price = rideType === "shared" ? Math.round(dest.basePrice * 0.70) : dest.basePrice;
              return (
                <button
                  key={dest.id}
                  onClick={() => { setSelected(dest); setStep("passenger_type"); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
                  style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(75,15,20,0.06)" }}>
                    <span style={{ fontSize: 22 }}>{dest.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p style={{ color: "#1E1E1E", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{dest.name}</p>
                    <p style={{ color: "#9a8a7a", fontSize: 12, marginTop: 2 }}>{dest.area}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: MAROON, fontSize: 18, fontWeight: 900 }}>₱{price}</p>
                    {rideType === "shared" && dest.basePrice !== price && (
                      <p style={{ color: "#9a8a7a", fontSize: 11, textDecoration: "line-through" }}>₱{dest.basePrice}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ─── STEP 2: PASSENGER TYPE ─── */
  if (step === "passenger_type") {
    const types: { key: PassengerType; emoji: string; label: string; sublabel: string; discount: string }[] = [
      { key: "regular", emoji: "👤", label: "Regular", sublabel: "Walang diskwento", discount: rideType === "shared" ? "-30% (Shared)" : "Walang diskwento" },
      { key: "student", emoji: "🎓", label: "Estudyante", sublabel: "May valid student ID", discount: rideType === "shared" ? "-40% (Shared+Student)" : "-10% Student" },
      { key: "pwd",     emoji: "♿", label: "PWD",       sublabel: "May valid PWD ID", discount: rideType === "shared" ? "-40% (Shared+PWD)" : "-10% PWD" },
    ];

    return (
      <div className="h-screen flex flex-col" style={{ background: CREAM }}>
        <div className="px-5 pt-12 pb-6" style={{ background: `linear-gradient(160deg, ${MAROON} 0%, #6E171D 100%)` }}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setStep("destination")} className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,248,231,0.15)" }}>
              <ArrowLeft size={18} color="#FFF8E7" />
            </button>
            <div>
              <p style={{ color: "rgba(255,248,231,0.65)", fontSize: 12 }}>Papunta sa {selected?.name}</p>
              <p style={{ color: "#FFF8E7", fontSize: 17, fontWeight: 800, lineHeight: 1 }}>Sino ka?</p>
            </div>
          </div>

          {/* Selected destination pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,248,231,0.1)" }}>
            <span style={{ fontSize: 16 }}>{selected?.emoji}</span>
            <p style={{ color: CREAM, fontSize: 13, fontWeight: 600 }}>{selected?.name}</p>
            <span style={{ color: "rgba(255,248,231,0.5)", fontSize: 12 }}>·</span>
            <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>₱{selected?.basePrice}</span>
          </div>
        </div>

        <div className="flex-1 px-5 pt-5 pb-8">
          <p style={{ color: "#7a6a5a", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Piliin ang uri ng pasahero para malaman ang iyong diskwento. May ID required sa boarding.
          </p>

          <div className="space-y-3">
            {types.map(t => (
              <button
                key={t.key}
                onClick={() => setPassengerType(t.key)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
                style={{
                  background: passengerType === t.key ? "rgba(75,15,20,0.06)" : "#ffffff",
                  border: passengerType === t.key ? `2px solid ${MAROON}` : "2px solid rgba(75,15,20,0.1)",
                  boxShadow: passengerType === t.key ? "0 4px 16px rgba(75,15,20,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: passengerType === t.key ? "rgba(75,15,20,0.1)" : "rgba(75,15,20,0.05)" }}>
                  <span style={{ fontSize: 28 }}>{t.emoji}</span>
                </div>
                <div className="flex-1">
                  <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 800 }}>{t.label}</p>
                  <p style={{ color: "#9a8a7a", fontSize: 12, marginTop: 2 }}>{t.sublabel}</p>
                  <p style={{ color: t.key !== "regular" || rideType === "shared" ? "#2E7D32" : "#9a8a7a", fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                    {t.discount}
                  </p>
                </div>
                {/* Price preview */}
                <div className="text-right">
                  <p style={{ color: MAROON, fontSize: 20, fontWeight: 900 }}>
                    ₱{selected ? calcFinalPrice(selected.basePrice, rideType, t.key, null) : 0}
                  </p>
                  {(t.key !== "regular" || rideType === "shared") && (
                    <p style={{ color: "#9a8a7a", fontSize: 11, textDecoration: "line-through" }}>₱{selected?.basePrice}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <p style={{ color: "#9a8a7a", fontSize: 11, marginTop: 12, textAlign: "center" }}>
            ⚠️ Student at PWD lamang. Hindi pwedeng pagsabayin ang dalawang diskwento.
          </p>

          <button
            onClick={() => setStep("confirm")}
            className="w-full h-14 rounded-2xl flex items-center justify-center mt-5"
            style={{ background: `linear-gradient(135deg, ${MAROON}, #6E171D)`, boxShadow: "0 6px 20px rgba(75,15,20,0.3)" }}
          >
            <span style={{ color: GOLD, fontSize: 16, fontWeight: 800 }}>Ituloy →</span>
          </button>
        </div>
      </div>
    );
  }

  /* ─── STEP 3: CONFIRM BOOKING ─── */
  return (
    <div className="h-screen flex flex-col" style={{ background: CREAM }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-4 flex items-center justify-between"
        style={{ background: MAROON, boxShadow: "0 2px 12px rgba(75,15,20,0.3)" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("passenger_type")} className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,248,231,0.15)" }}>
            <ArrowLeft size={18} color="#FFF8E7" />
          </button>
          <p style={{ color: "#FFF8E7", fontSize: 16, fontWeight: 800 }}>I-confirm ang Booking</p>
        </div>
        <button onClick={() => navigate("/passenger")} className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,248,231,0.15)" }}>
          <X size={18} color="#FFF8E7" />
        </button>
      </div>

      {/* Map */}
      <div style={{ height: 220 }}>
        <MapView
          pickup={pickupCoords}
          destination={selected ? { ...selected.coords, address: selected.name } : null}
          height="220px"
          showCurrentLocation={true}
          onPickupChange={loc => { setPickup(loc.address); setPickupCoords(loc); }}
        />
      </div>

      {/* Booking details */}
      <div className="flex-1 overflow-auto px-5 pt-4 pb-6 space-y-3">

        {/* Pickup location */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)" }}>
          <div className="px-4 pt-3 pb-1">
            <p style={{ color: "#9a8a7a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pickup Location</p>
          </div>
          <button
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            className="w-full flex items-center gap-3 px-4 py-3"
          >
            <Locate size={18} color={MAROON} />
            <p style={{ color: pickup ? "#1E1E1E" : "#9a8a7a", fontSize: 13, fontWeight: pickup ? 600 : 400, flex: 1, textAlign: "left" }}>
              {isLoadingLocation ? "Hinahanap ang lokasyon..." : pickup || "I-tap para gamitin ang kasalukuyang lokasyon"}
            </p>
          </button>
          {!pickup && (
            <div className="px-4 pb-3">
              <p style={{ color: "#9a8a7a", fontSize: 11 }}>O i-tap ang mapa para pumili ng pickup point</p>
            </div>
          )}
        </div>

        {/* Booking summary */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)" }}>
          <div className="px-4 pt-3 pb-1">
            <p style={{ color: "#9a8a7a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Buod ng Biyahe</p>
          </div>
          {[
            { label: "Destinasyon", value: `${selected?.emoji} ${selected?.name}` },
            { label: "Uri ng Biyahe", value: rideType === "solo" ? "👤 Solo" : "👥 Shared" },
            { label: "Pasahero", value: passengerType === "regular" ? "👤 Regular" : passengerType === "student" ? "🎓 Estudyante" : "♿ PWD" },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i > 0 ? "1px solid rgba(75,15,20,0.06)" : "none" }}>
              <p style={{ color: "#7a6a5a", fontSize: 13 }}>{row.label}</p>
              <p style={{ color: "#1E1E1E", fontSize: 13, fontWeight: 700 }}>{row.value}</p>
            </div>
          ))}

          {/* Price breakdown */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(75,15,20,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ color: "#7a6a5a", fontSize: 13 }}>Base Price</p>
              <p style={{ color: "#1E1E1E", fontSize: 13, fontWeight: 600 }}>₱{selected?.basePrice}</p>
            </div>
            {discountBreakdown().map(d => (
              <div key={d.label} className="flex items-center justify-between mb-1">
                <p style={{ color: "#2E7D32", fontSize: 12 }}>{d.label}</p>
                <p style={{ color: "#2E7D32", fontSize: 12, fontWeight: 600 }}>{d.amount}</p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(75,15,20,0.1)", marginTop: 4 }}>
              <p style={{ color: "#1E1E1E", fontSize: 15, fontWeight: 800 }}>Kabuuang Bayad</p>
              <p style={{ color: MAROON, fontSize: 22, fontWeight: 900 }}>₱{finalPrice}</p>
            </div>
          </div>

          {/* Promo code */}
          <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(75,15,20,0.06)" }}>
            {appliedPromo ? (
              <div className="flex items-center justify-between p-3 rounded-xl mt-3" style={{ background: "rgba(46,125,50,0.08)", border: "1px solid rgba(46,125,50,0.2)" }}>
                <div className="flex items-center gap-2">
                  <Tag size={14} color="#2E7D32" />
                  <p style={{ color: "#2E7D32", fontSize: 13, fontWeight: 700 }}>{appliedPromo.code} — {appliedPromo.discount}% off</p>
                </div>
                <button onClick={() => setAppliedPromo(null)}><X size={14} color="#C62828" /></button>
              </div>
            ) : showPromoInput ? (
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="Promo code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 rounded-xl outline-none"
                  style={{ height: 40, border: "1.5px solid rgba(75,15,20,0.15)", fontSize: 14, background: "#ffffff" }}
                />
                <button onClick={applyPromo} className="px-4 rounded-xl" style={{ background: MAROON, height: 40 }}>
                  <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>Apply</span>
                </button>
                <button onClick={() => setShowPromoInput(false)} className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(75,15,20,0.08)" }}>
                  <X size={14} color={MAROON} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowPromoInput(true)} className="flex items-center gap-2 mt-3">
                <Tag size={14} color={MAROON} />
                <span style={{ color: MAROON, fontSize: 13, fontWeight: 600 }}>Magdagdag ng promo code</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment method */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1.5px solid rgba(75,15,20,0.08)" }}>
          <div className="px-4 pt-3 pb-1">
            <p style={{ color: "#9a8a7a", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Paraan ng Bayad</p>
          </div>
          <div className="px-4 pb-3 flex gap-3">
            {([
              { key: "cash" as PaymentMethod, emoji: "💵", label: "Cash" },
              { key: "epayment" as PaymentMethod, emoji: "💳", label: "E-Payment" },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setPaymentMethod(m.key)}
                className="flex-1 flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: paymentMethod === m.key ? "rgba(75,15,20,0.06)" : "transparent",
                  border: paymentMethod === m.key ? `2px solid ${MAROON}` : "2px solid rgba(75,15,20,0.1)",
                }}
              >
                <span style={{ fontSize: 18 }}>{m.emoji}</span>
                <span style={{ color: paymentMethod === m.key ? MAROON : "#7a6a5a", fontSize: 13, fontWeight: paymentMethod === m.key ? 700 : 500 }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Book button */}
        <button
          onClick={() => {
            if (!pickupCoords) { toast.error("Piliin muna ang iyong pickup location"); return; }
            setShowConfirmDialog(true);
          }}
          disabled={bookingLoading}
          className="w-full h-14 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${MAROON}, #6E171D)`, boxShadow: "0 6px 20px rgba(75,15,20,0.3)" }}
        >
          <span style={{ color: GOLD, fontSize: 16, fontWeight: 800 }}>
            {bookingLoading ? "Nag-iimpok..." : `🛺 I-book na — ₱${finalPrice}`}
          </span>
        </button>
      </div>

      {/* Confirm dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-[9999] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-3xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <DialogHeader>
              <DialogPrimitive.Title style={{ color: MAROON, fontSize: 18, fontWeight: 800 }}>Kumpirmahin ang Booking</DialogPrimitive.Title>
              <DialogPrimitive.Description style={{ color: "#7a6a5a", fontSize: 13 }}>I-review ang detalye ng iyong biyahe</DialogPrimitive.Description>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {[
                { label: "Pickup", value: pickup },
                { label: "Destinasyon", value: `${selected?.emoji} ${selected?.name}` },
                { label: "Uri ng Biyahe", value: rideType === "solo" ? "👤 Solo" : "👥 Shared" },
                { label: "Pasahero", value: passengerType === "regular" ? "Regular" : passengerType === "student" ? "🎓 Estudyante" : "♿ PWD" },
                { label: "Bayad", value: `₱${finalPrice}`, highlight: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(75,15,20,0.07)" }}>
                  <span style={{ color: "#7a6a5a", fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: row.highlight ? MAROON : "#1E1E1E", fontSize: row.highlight ? 18 : 13, fontWeight: row.highlight ? 900 : 600 }}>{row.value}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowConfirmDialog(false)} className="flex-1 h-12 rounded-2xl" style={{ background: "rgba(75,15,20,0.07)", color: MAROON, fontSize: 14, fontWeight: 700 }}>
                  Bumalik
                </button>
                <button onClick={handleConfirm} className="flex-1 h-12 rounded-2xl" style={{ background: `linear-gradient(135deg, ${MAROON}, #6E171D)`, color: GOLD, fontSize: 14, fontWeight: 800, boxShadow: "0 4px 12px rgba(75,15,20,0.3)" }}>
                  I-confirm ✓
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
