import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Locate, ArrowLeft, X, Tag, Search,
  Navigation2, Clock, Ruler, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import { useBooking } from "../../context/BookingContext";
import { createBooking, getPassengerActiveBooking } from "../../utils/bookingDatabase";
import { createSupabaseBooking, getSupabasePassengerActiveBooking } from "../../utils/supabaseBookings";
import { formatPersonName } from "../../utils/nameFormatting";
import { applyRideDiscounts, calculateFare } from "../../utils/fareCalculator";
import {
  Dialog, DialogPortal,
} from "../../components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// ─── Leaflet icon fix ─────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ─── Constants ────────────────────────────────────────────────────────────────
const MAROON = "#4B0F14";
const GOLD   = "#D4AF37";
const GREEN  = "#16A34A";
const DEFAULT_CENTER = { lat: 14.6042, lng: 121.0120 };

type RideType      = "solo";
type PassengerType = "regular" | "student" | "pwd";
type PaymentMethod = "cash" | "epayment";
type PinMode       = "pickup" | "dropoff";

interface LatLng { lat: number; lng: number; address: string }
type LocationSearchState = Record<PinMode, string>;
type LocationSuggestionMap = Record<PinMode, PlaceSuggestion[]>;

interface PlaceSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
  category: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makePickupIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="width:36px;height:36px;border-radius:50%;background:${GREEN};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/></svg>
      </div>
      <div style="width:2px;height:10px;background:${GREEN};margin-top:-2px;"></div>
    </div>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  });
}

function makeDropoffIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="width:36px;height:36px;border-radius:50%;background:${MAROON};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/></svg>
      </div>
      <div style="width:2px;height:10px;background:${MAROON};margin-top:-2px;"></div>
    </div>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      q: trimmed,
      limit: "6",
      countrycodes: "ph",
      addressdetails: "1",
      "accept-language": "en",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data
      .map((item: any): PlaceSuggestion | null => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return {
          id: String(item.place_id || `${lat},${lng}`),
          label: String(item.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`),
          lat,
          lng,
          category: String(item.type || item.class || "place").replace(/_/g, " "),
        };
      })
      .filter(Boolean) as PlaceSuggestion[];
  } catch {
    return [];
  }
}

async function fetchOSRMRoute(from: LatLng, to: LatLng): Promise<{
  waypoints: [number, number][];
  distanceKm: number;
  durationMin: number;
} | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return {
      waypoints: coords,
      distanceKm: route.distance / 1000,
      durationMin: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

function calcFinalPrice(
  baseFare: number,
  rideType: RideType,
  passengerType: PassengerType,
  promoDiscount?: number
) {
  return applyRideDiscounts(baseFare, { rideType, passengerType, promoDiscount });
}

const AVAILABLE_PROMOS = [
  { code: "ARANGKADA",   description: "Welcome to Arangkada! 20% off",       discount: 20 },
  { code: "STAMESARIDE", description: "Sta. Mesa pride! 15% off your ride",  discount: 15 },
  { code: "PUPSAKAY",    description: "PUP x Arangkada - 12% off",           discount: 12 },
  { code: "SAKTOLANG",   description: "Sarap ng biyahe! 10% off",            discount: 10 },
  { code: "FLASH30",     description: "Flash promo! 30% off today only",     discount: 30 },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookingPage() {
  const navigate     = useNavigate();
  const { user }     = useUser();
  const { setActiveBooking, refreshBooking } = useBooking();
  const [rideType, setRideType] = useState<"solo" | "group">("solo");
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [reserveEntire, setReserveEntire] = useState<boolean>(false);

  // Map refs
  const mapContainerRef  = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<L.Map | null>(null);
  const pickupMarkerRef  = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef     = useRef<L.Polyline | null>(null);
  const gpsMarkerRef     = useRef<L.Marker | null>(null);

  // State
  const [pinMode, setPinMode]           = useState<PinMode>("pickup");
  const [pickup,  setPickup]            = useState<LatLng | null>(null);
  const [dropoff, setDropoff]           = useState<LatLng | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [promoCode,  setPromoCode]      = useState("");
  const [appliedPromo, setAppliedPromo] = useState<typeof AVAILABLE_PROMOS[0] | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [showOptions,   setShowOptions] = useState(false);
  const [showConfirm,   setShowConfirm] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [gpsLoading,  setGpsLoading]    = useState(false);
  const [locationQueries, setLocationQueries] = useState<LocationSearchState>({ pickup: "", dropoff: "" });
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestionMap>({ pickup: [], dropoff: [] });
  const [searchLoading, setSearchLoading] = useState<Record<PinMode, boolean>>({ pickup: false, dropoff: false });
  const [activeSearch, setActiveSearch] = useState<PinMode | null>(null);

  // Route data
  const [routeData, setRouteData] = useState<{
    distanceKm: number;
    durationMin: number;
  } | null>(null);

  const distanceKm  = routeData?.distanceKm ?? 0;
  const durationMin = routeData?.durationMin ?? 0;
  const standardFare = calculateFare(distanceKm).finalFare;

  let basePrice = 0;
  if (rideType === "solo") {
    basePrice = Math.max(50, standardFare);
  } else {
    const effectiveCount = reserveEntire ? 5 : passengerCount;
    basePrice = effectiveCount * standardFare;
  }

  let finalPrice = basePrice;
  if (appliedPromo) {
    finalPrice = Math.max(1, Math.round(basePrice * (1 - appliedPromo.discount / 100)));
  }


  const setLocationByMode = useCallback((mode: PinMode, loc: LatLng, mapZoom = 17) => {
    if (mode === "pickup") {
      setPickup(loc);
    } else {
      setDropoff(loc);
    }

    setPinMode(mode);
    setLocationQueries(prev => ({ ...prev, [mode]: loc.address }));
    setLocationSuggestions(prev => ({ ...prev, [mode]: [] }));
    setActiveSearch(null);
    mapRef.current?.setView([loc.lat, loc.lng], mapZoom);
  }, []);

  // ── Map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
      [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 15
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    const refreshMapSize = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          map.invalidateSize();
        });
      });
    };

    refreshMapSize();
    const resizeTimer = window.setTimeout(refreshMapSize, 180);
    window.addEventListener("resize", refreshMapSize);

    // Try auto-detect GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!mapRef.current) return;
        mapRef.current.setView([latitude, longitude], 16);

        // GPS dot
        if (gpsMarkerRef.current) gpsMarkerRef.current.remove();
        gpsMarkerRef.current = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.25);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(mapRef.current);

        const addr = await reverseGeocode(latitude, longitude);
        setLocationByMode("pickup", { lat: latitude, lng: longitude, address: addr }, 16);
      }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    }

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", refreshMapSize);
      map.remove();
      mapRef.current = null;
    };
  }, [setLocationByMode]);

  // ── Map click handler ────────────────────────────────────────────────────────
  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    const addr = await reverseGeocode(lat, lng);
    const loc: LatLng = { lat, lng, address: addr };

    setLocationByMode(pinMode, loc, 17);
  }, [pinMode, setLocationByMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on("click", handleMapClick);
    return () => { map.off("click", handleMapClick); };
  }, [handleMapClick]);

  // ── Update pickup marker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null; }
    if (!pickup) return;
    pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: makePickupIcon(), zIndexOffset: 100 })
      .bindPopup(`<b>Pickup</b><br>${pickup.address}`)
      .addTo(mapRef.current);
  }, [pickup]);

  // ── Update dropoff marker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null; }
    if (!dropoff) return;
    dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], { icon: makeDropoffIcon(), zIndexOffset: 100 })
      .bindPopup(`<b>Dropoff</b><br>${dropoff.address}`)
      .addTo(mapRef.current);
  }, [dropoff]);

  // ── Fetch OSRM route when both points set ────────────────────────────────────
  useEffect(() => {
    if (!pickup || !dropoff || !mapRef.current) { setRouteData(null); return; }

    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }

    fetchOSRMRoute(pickup, dropoff).then((result) => {
      if (!result || !mapRef.current) return;

      setRouteData({ distanceKm: result.distanceKm, durationMin: result.durationMin });

      routeLineRef.current = L.polyline(result.waypoints, {
        color: "#1D4ED8",
        weight: 5,
        opacity: 0.9,
      }).addTo(mapRef.current);

      // Fit map to show both pins + route
      const bounds = L.latLngBounds([
        [pickup.lat,  pickup.lng],
        [dropoff.lat, dropoff.lng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    });
  }, [pickup, dropoff]);

  // ── GPS button ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSearch) return;

    const query = locationQueries[activeSearch].trim();
    if (query.length < 3) {
      setLocationSuggestions(prev => ({ ...prev, [activeSearch]: [] }));
      setSearchLoading(prev => ({ ...prev, [activeSearch]: false }));
      return;
    }

    let cancelled = false;
    setSearchLoading(prev => ({ ...prev, [activeSearch]: true }));

    const timer = window.setTimeout(async () => {
      const results = await searchPlaces(query);
      if (!cancelled) {
        setLocationSuggestions(prev => ({ ...prev, [activeSearch]: results }));
        setSearchLoading(prev => ({ ...prev, [activeSearch]: false }));
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeSearch, locationQueries]);

  const handleLocationQueryChange = (mode: PinMode, value: string) => {
    setPinMode(mode);
    setActiveSearch(mode);
    setLocationQueries(prev => ({ ...prev, [mode]: value }));
  };

  const handleSelectSuggestion = (mode: PinMode, suggestion: PlaceSuggestion) => {
    setLocationByMode(mode, {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.label,
    });
  };

  const handleSelectFromMap = (mode: PinMode) => {
    setPinMode(mode);
    setActiveSearch(null);
    setLocationSuggestions(prev => ({ ...prev, [mode]: [] }));
    toast.info(`Tap the map to set your ${mode === "pickup" ? "pickup" : "destination"} location.`);
  };

  const handleUseGPS = (mode: PinMode = "pickup") => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const addr = await reverseGeocode(latitude, longitude);
      const loc: LatLng = { lat: latitude, lng: longitude, address: addr };
      setLocationByMode(mode, loc, 16);
      toast.success(`${mode === "pickup" ? "Pickup" : "Destination"} set to your current location`);
      setGpsLoading(false);
    }, () => { toast.error("Could not get your location"); setGpsLoading(false); },
       { enableHighAccuracy: true, timeout: 10000 });
  };

  // ── Promo ────────────────────────────────────────────────────────────────────
  const applyPromo = () => {
    const promo = AVAILABLE_PROMOS.find(p => p.code === promoCode.toUpperCase());
    if (promo) {
      setAppliedPromo(promo);
      toast.success(`Promo "${promo.code}" applied! ${promo.discount}% off`);
      setShowPromoInput(false);
      setPromoCode("");
    } else {
      toast.error("Invalid promo code");
    }
  };

  // ── Book ─────────────────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!user || !pickup || !dropoff) { toast.error("Please set pickup and drop-off"); return; }
    setBookingLoading(true);
    setShowConfirm(false);

    try {
      const existingBooking = await getSupabasePassengerActiveBooking(user) || getPassengerActiveBooking(user.username);
      if (existingBooking) {
        setActiveBooking(existingBooking);
        refreshBooking();
        toast.info("You already have an active booking.");
        navigate(existingBooking.status === "pending" ? "/passenger/finding-driver" : "/passenger/ongoing-booking");
        return;
      }

      const passengerName = formatPersonName(user, user.username);
      const discount = appliedPromo
        ? { type: appliedPromo.code, amount: appliedPromo.discount }
        : undefined;

      const pCount = rideType === "solo" ? 1 : passengerCount;
      const resEntire = rideType === "solo" ? false : reserveEntire;

      const supabaseBooking = await createSupabaseBooking({
        passenger: user,
        pickupLocation: pickup,
        destination: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
        distance: distanceKm,
        basePrice: basePrice,
        finalPrice,
        paymentMethod: paymentMethod === "epayment" ? "E-Payment" : "Cash",
        vehicleType: "Tricycle",
        rideType,
        passengerCount: pCount,
        reserveEntire: resEntire,
        discount,
      });

      if (supabaseBooking) {
        setActiveBooking(supabaseBooking);
        refreshBooking();
        toast.success("Booking sent! Waiting for a driver to accept.");
        navigate("/passenger/finding-driver");
        return;
      }

      const booking = createBooking({
        passengerUsername: user.username,
        passengerName,
        passengerPhone: user.phoneNumber,
        pickupLocation: pickup,
        destination: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address },
        distance: distanceKm,
        basePrice: basePrice,
        finalPrice,
        paymentMethod: paymentMethod === "epayment" ? "E-Payment" : "Cash",
        vehicleType: "Tricycle",
        rideType,
        passengerCount: pCount,
        reserveEntire: resEntire,
        discount,
      });

      setActiveBooking(booking);
      refreshBooking();
      toast.success("Booking sent! Waiting for a driver to accept.");
      navigate("/passenger/finding-driver");
    } catch {
      toast.error("Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const renderLocationSearch = (
    mode: PinMode,
    label: string,
    placeholder: string,
    selected: LatLng | null,
    color: string,
  ) => {
    const suggestions = locationSuggestions[mode];
    const query = locationQueries[mode];
    const isActive = activeSearch === mode;
    const canShowSuggestions = isActive && (searchLoading[mode] || suggestions.length > 0 || query.trim().length >= 3);

    return (
      <div
        className="rounded-2xl transition-all"
        style={{
          background: pinMode === mode ? `${color}0D` : "#f9fafb",
          border: `2px solid ${pinMode === mode ? color : "#e5e7eb"}`,
        }}
      >
        <div className="flex items-center gap-3 px-3 pt-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: color }}
          >
            <MapPin size={14} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6b7280" }}>
              {label}
            </p>
            {selected && (
              <p className="text-[11px] font-semibold truncate" style={{ color: "#374151" }}>
                {selected.address}
              </p>
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div
            className="flex items-center gap-2 px-3 rounded-xl"
            style={{ background: "#fff", border: "1.5px solid #e5e7eb", minHeight: 42 }}
          >
            <Search size={15} color="#6b7280" />
            <input
              type="text"
              value={query}
              placeholder={placeholder}
              onFocus={() => {
                setPinMode(mode);
                setActiveSearch(mode);
              }}
              onChange={(e) => handleLocationQueryChange(mode, e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold"
              style={{ color: "#111827" }}
            />
            {mode === "pickup" ? (
              <button
                type="button"
                onClick={() => handleUseGPS(mode)}
                disabled={gpsLoading}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(37,99,235,0.08)" }}
                title="Use current location"
              >
                <Locate size={14} color={gpsLoading ? "#9ca3af" : "#2563EB"} />
              </button>
            ) : selected ? (
              <button
                type="button"
                onClick={() => {
                  setDropoff(null);
                  setRouteData(null);
                  setLocationQueries(prev => ({ ...prev, dropoff: "" }));
                  setLocationSuggestions(prev => ({ ...prev, dropoff: [] }));
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(75,15,20,0.08)" }}
                title="Clear destination"
              >
                <X size={14} color={MAROON} />
              </button>
            ) : null}
          </div>

          {canShowSuggestions && (
            <div
              className="mt-2 rounded-xl overflow-hidden"
              style={{ background: "#fff", border: "1px solid #e5e7eb" }}
            >
              {searchLoading[mode] ? (
                <div className="px-3 py-2 text-xs font-semibold" style={{ color: "#6b7280" }}>
                  Searching places...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(mode, suggestion)}
                    className="w-full px-3 py-2 text-left border-b last:border-b-0"
                    style={{ borderColor: "#f3f4f6" }}
                  >
                    <p className="text-xs font-bold line-clamp-2" style={{ color: "#111827" }}>
                      {suggestion.label}
                    </p>
                    <p className="text-[10px] capitalize" style={{ color: "#6b7280" }}>
                      {suggestion.category}
                    </p>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs font-semibold" style={{ color: "#6b7280" }}>
                  No places found. Try a nearby landmark or tap Select from Map.
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleUseGPS(mode)}
              disabled={gpsLoading}
              className="flex-1 h-9 rounded-xl text-xs font-bold"
              style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB" }}
            >
              Current Location
            </button>
            <button
              type="button"
              onClick={() => handleSelectFromMap(mode)}
              className="flex-1 h-9 rounded-xl text-xs font-bold"
              style={{ background: `${color}14`, color }}
            >
              Select from Map
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full min-h-full w-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Full-screen Map ── */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" style={{ height: "100%", width: "100%" }} />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-10 pb-3 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => navigate("/passenger")}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.95)" }}
          >
            <ArrowLeft size={18} color={MAROON} />
          </button>
          <div className="flex-1 px-4 py-2.5 rounded-2xl shadow-lg"
            style={{ background: "rgba(255,255,255,0.95)" }}>
            <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>Book a Tricycle</p>
            <p className="text-sm font-bold" style={{ color: MAROON }}>
              {rideType === "solo" ? "Solo Ride" : "Group Ride"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Pin mode selector (floating pill) ── */}
      <div className="absolute z-20 pointer-events-auto"
        style={{ top: "136px", left: "50%", transform: "translateX(-50%)" }}>
        <div className="flex rounded-full shadow-lg overflow-hidden border-2"
          style={{ borderColor: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.97)" }}>
          <button
            onClick={() => setPinMode("pickup")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all"
            style={{
              background: pinMode === "pickup" ? GREEN : "transparent",
              color:      pinMode === "pickup" ? "#fff" : "#374151",
            }}
          >
            <MapPin size={12} />  Pickup
          </button>
          <button
            onClick={() => setPinMode("dropoff")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all"
            style={{
              background: pinMode === "dropoff" ? MAROON : "transparent",
              color:      pinMode === "dropoff" ? "#fff"  : "#374151",
            }}
          >
            <MapPin size={12} /> Drop-off
          </button>
        </div>
        <p className="text-center text-[10px] mt-1 font-semibold"
          style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
          Tap map to pin {pinMode === "pickup" ? "pickup" : "drop-off"} location
        </p>
      </div>

      {/* ── GPS button (floating) ── */}
      <button
        onClick={() => handleUseGPS("pickup")}
        disabled={gpsLoading}
        className="absolute z-20 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
        style={{ right: 16, bottom: 320, background: "#fff" }}
      >
        <Locate size={20} color={gpsLoading ? "#9ca3af" : "#2563EB"} />
      </button>

      {/* ── Bottom panel ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl shadow-2xl"
        style={{ background: "#fff", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "#e5e7eb" }} />
        </div>

        {/* ── Location inputs ── */}
        <div className="px-4 pt-1 pb-2 space-y-2">
          {renderLocationSearch(
            "pickup",
            "Pickup",
            "Search pickup address or landmark",
            pickup,
            GREEN,
          )}

          {/* Dotted connector */}
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 flex flex-col items-center gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#d1d5db" }} />
              ))}
            </div>
            <div className="flex-1 h-px" style={{ background: "#f3f4f6" }} />
          </div>

          {renderLocationSearch(
            "dropoff",
            "Destination",
            "Search destination, landmark, or place",
            dropoff,
            MAROON,
          )}
        </div>

        {/* ── Route info strip (only when route loaded) ── */}
        {routeData && (
          <div className="mx-4 mb-2 px-4 py-3 rounded-2xl flex items-center gap-4"
            style={{ background: "rgba(29,78,216,0.05)", border: "1.5px solid rgba(29,78,216,0.12)" }}>
            <div className="flex items-center gap-1.5">
              <Ruler size={14} color="#1D4ED8" />
              <span className="text-sm font-bold" style={{ color: "#1D4ED8" }}>
                {distanceKm >= 1
                  ? `${distanceKm.toFixed(2)} km`
                  : `${Math.round(distanceKm * 1000)} m`}
              </span>
            </div>
            <div className="w-px h-4" style={{ background: "#bfdbfe" }} />
            <div className="flex items-center gap-1.5">
              <Clock size={14} color="#1D4ED8" />
              <span className="text-sm font-bold" style={{ color: "#1D4ED8" }}>{durationMin} mins</span>
            </div>
            <div className="w-px h-4" style={{ background: "#bfdbfe" }} />
            <div className="flex items-center gap-1.5 ml-auto">
              <Navigation2 size={14} color={MAROON} />
              <span className="text-sm font-bold" style={{ color: MAROON }}>Via road</span>
            </div>
          </div>
        )}

        {/* ── Ride Type Selector ── */}
        <div className="mx-4 mb-3 p-3 rounded-2xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#6b7280" }}>Ride Type</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRideType("solo");
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex flex-col items-center"
              style={{
                background: rideType === "solo" ? "rgba(75,15,20,0.1)" : "#fff",
                color: rideType === "solo" ? MAROON : "#4b5563",
                border: rideType === "solo" ? `2px solid ${MAROON}` : "2px solid #e5e7eb",
              }}
            >
              <span>Solo Ride</span>
              <span className="text-[10px] font-normal opacity-85 mt-0.5">₱50 min • Exclusive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRideType("group");
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex flex-col items-center"
              style={{
                background: rideType === "group" ? "rgba(75,15,20,0.1)" : "#fff",
                color: rideType === "group" ? MAROON : "#4b5563",
                border: rideType === "group" ? `2px solid ${MAROON}` : "2px solid #e5e7eb",
              }}
            >
              <span>Group Ride</span>
              <span className="text-[10px] font-normal opacity-85 mt-0.5">Companions • Max 5</span>
            </button>
          </div>

          {/* Group details if selected */}
          {rideType === "group" && (
            <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold" style={{ color: "#374151" }}>Number of Passengers:</label>
                <select
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(Number(e.target.value))}
                  disabled={reserveEntire}
                  className="px-3 py-1.5 rounded-xl border text-sm font-bold outline-none bg-white"
                  style={{ borderColor: "#d1d5db" }}
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} Passenger{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reserveEntire"
                  checked={reserveEntire}
                  onChange={(e) => setReserveEntire(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="reserveEntire" className="text-xs font-bold cursor-pointer" style={{ color: "#4b5563" }}>
                  Reserve Entire Vehicle (Bill for 5 seats)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── Options toggle ── */}
        <button
          onClick={() => setShowOptions(v => !v)}
          className="flex items-center gap-2 mx-4 mb-2 text-xs font-bold"
          style={{ color: "#6b7280" }}
        >
          <span>{showOptions ? "▲" : "▼"}</span>
          Ride options & promo
        </button>

        {/* ── Collapsible options ── */}
        {showOptions && (
          <div className="px-4 pb-2 space-y-3 animate-in slide-in-from-bottom-2">
            {/* Payment */}
            <div className="flex gap-2">
              {([
                { key: "cash"     as PaymentMethod, label: "Cash",       icon: <span>₱</span> },
                { key: "epayment" as PaymentMethod, label: "E-Payment",   icon: <CreditCard size={12}/> },
              ]).map(m => (
                <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: paymentMethod === m.key ? "rgba(212,175,55,0.1)" : "#f3f4f6",
                    color:      paymentMethod === m.key ? "#92650a" : "#6b7280",
                    border:     paymentMethod === m.key ? `1.5px solid ${GOLD}` : "1.5px solid #e5e7eb",
                  }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* Promo */}
            {appliedPromo ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.2)" }}>
                <div className="flex items-center gap-2">
                  <Tag size={13} color={GREEN} />
                  <span className="text-xs font-bold" style={{ color: GREEN }}>
                    {appliedPromo.code} — {appliedPromo.discount}% off
                  </span>
                </div>
                <button onClick={() => setAppliedPromo(null)}>
                  <X size={13} color="#ef4444" />
                </button>
              </div>
            ) : showPromoInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20))}
                  className="flex-1 px-3 rounded-xl outline-none text-sm"
                  style={{ height: 40, border: `1.5px solid ${MAROON}`, background: "#fff" }}
                />
                <button onClick={applyPromo} className="px-4 rounded-xl text-sm font-bold"
                  style={{ background: MAROON, color: GOLD, height: 40 }}>Apply</button>
                <button onClick={() => setShowPromoInput(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#f3f4f6" }}>
                  <X size={13} color="#6b7280" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowPromoInput(true)}
                className="flex items-center gap-2 text-xs font-semibold"
                style={{ color: MAROON }}>
                <Tag size={12} /> Add promo code
              </button>
            )}
          </div>
        )}

        {/* ── Fare estimate + Book ── */}
        <div className="px-4 pt-2 pb-5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>Fare Estimate</p>
            <p className="text-2xl font-black" style={{ color: MAROON }}>
              ₱{dropoff && distanceKm > 0 ? finalPrice : "—"}
            </p>
            {appliedPromo && dropoff && (
              <p className="text-xs" style={{ color: GREEN }}>
                incl. {appliedPromo.discount}% off
              </p>
            )}
          </div>
          <button
            onClick={() => {
              if (!pickup) { toast.error("Please set your pickup location"); return; }
              if (!dropoff) { toast.error("Please set your drop-off location"); return; }
              setShowConfirm(true);
            }}
            disabled={bookingLoading}
            className="flex-1 h-14 rounded-2xl flex items-center justify-center font-bold text-base shadow-lg transition-opacity"
            style={{
              background: `linear-gradient(135deg, ${MAROON}, #6E171D)`,
              color: GOLD,
              opacity: bookingLoading ? 0.7 : 1,
              boxShadow: "0 6px 20px rgba(75,15,20,0.35)",
            }}
          >
            {bookingLoading ? "Booking…" : "Book Now"}
          </button>
        </div>
      </div>

      {/* ── Confirm Dialog ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-[9999] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-3xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <DialogPrimitive.Title className="text-lg font-black mb-1" style={{ color: MAROON }}>
              Confirm Booking
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm mb-4" style={{ color: "#6b7280" }}>
              Review your ride details before confirming.
            </DialogPrimitive.Description>

            <div className="space-y-2 mb-4">
              {[
                { label: "Pickup",    value: pickup?.address     ?? "—" },
                { label: "Drop-off",  value: dropoff?.address    ?? "—" },
                { label: "Distance",  value: distanceKm >= 1 ? `${distanceKm.toFixed(2)} km` : `${Math.round(distanceKm * 1000)} m` },
                { label: "Duration",  value: `${durationMin} mins` },
                { label: "Ride",      value: rideType === "solo" ? "Solo Ride" : `Group Ride (${reserveEntire ? "Entire Vehicle" : `${passengerCount} Pax`})` },
                { label: "Passengers", value: rideType === "solo" ? "1" : (reserveEntire ? "5 (Reserved)" : String(passengerCount)) },
                { label: "Payment",   value: paymentMethod === "cash" ? "Cash" : "E-Payment" },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 py-1.5"
                  style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-sm" style={{ color: "#6b7280", flexShrink: 0 }}>{row.label}</span>
                  <span className="text-sm font-semibold text-right min-w-0 break-words" style={{ color: "#111827" }}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-base font-bold" style={{ color: "#111827" }}>Total Fare</span>
                <span className="text-2xl font-black" style={{ color: MAROON }}>₱{finalPrice}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 h-12 rounded-2xl font-bold text-sm"
                style={{ background: "#f3f4f6", color: MAROON }}>
                Back
              </button>
              <button onClick={handleBook}
                className="flex-1 h-12 rounded-2xl font-bold text-sm shadow-lg"
                style={{ background: `linear-gradient(135deg, ${MAROON}, #6E171D)`, color: GOLD, boxShadow: "0 4px 12px rgba(75,15,20,0.3)" }}>
                Confirm →
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
