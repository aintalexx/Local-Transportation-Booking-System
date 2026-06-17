import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, MessageCircle, Navigation2, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useBooking } from "../../context/BookingContext";
import { useUser } from "../../context/UserContext";
import {
  getPassengerActiveBooking,
  cancelBooking,
  type BookingData,
  type BookingStatus,
} from "../../utils/bookingDatabase";
import {
  getSupabasePassengerActiveBooking,
  subscribeToSupabaseBooking,
  updateSupabaseBookingStatus,
} from "../../utils/supabaseBookings";
import { Dialog, DialogPortal } from "../../components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

const DEFAULT_CENTER = { lat: 14.6042, lng: 121.0120 };
const MAROON = "#4B0F14";
const BLUE = "#0756A8";

const DRIVER_FOUND_STATUSES = new Set<BookingStatus>([
  "accepted",
  "driver_found",
  "en_route",
  "driver_to_pickup",
  "arrived",
  "driver_arrived",
  "ride_started",
  "in_progress",
  "ride_ongoing",
]);

function makePinIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:30px;height:30px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 7px 18px rgba(15,23,42,.25);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;">
          ${label}
        </div>
        <div style="width:2px;height:10px;background:${color};margin-top:-2px;"></div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });
}

function makeDriverIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="width:34px;height:34px;border-radius:999px;background:#0756A8;border:3px solid #fff;box-shadow:0 8px 18px rgba(7,86,168,.35);display:flex;align-items:center;justify-content:center;">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m16 8-3.6 8-1.2-3.2L8 11.6 16 8Z"></path>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function midpoint(a: BookingData["pickupLocation"], b: BookingData["destination"]) {
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  };
}

function getDriverPoint(booking: BookingData) {
  if (booking.currentDriverLocation) return booking.currentDriverLocation;
  const center = midpoint(booking.pickupLocation, booking.destination);
  return {
    lat: center.lat + 0.001,
    lng: center.lng - 0.001,
  };
}

function getInitials(name?: string) {
  if (!name) return "DR";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "DR";
}

export default function FindingDriverPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { activeBooking, refreshBooking, setActiveBooking } = useBooking();
  const [isLoadingBooking, setIsLoadingBooking] = useState(!activeBooking);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    setCancelLoading(true);
    try {
      if (activeBooking.id.startsWith("BK")) {
        cancelBooking(activeBooking.id);
      } else {
        await updateSupabaseBookingStatus(activeBooking.id, "cancelled");
      }
      setActiveBooking(null);
      toast.success("Booking cancelled.");
      navigate("/passenger", { replace: true });
    } catch (err) {
      toast.error("Failed to cancel booking.");
    } finally {
      setCancelLoading(false);
      setShowCancelDialog(false);
    }
  };

  const driverFound = useMemo(() => {
    if (!activeBooking) return false;
    return Boolean(
      activeBooking.driverName ||
      activeBooking.driverUsername ||
      DRIVER_FOUND_STATUSES.has(activeBooking.status)
    );
  }, [activeBooking]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (activeBooking) {
      setIsLoadingBooking(false);
      return;
    }

    let cancelled = false;

    const loadActiveBooking = async () => {
      setIsLoadingBooking(true);
      const supabaseBooking = await getSupabasePassengerActiveBooking(user);
      const localBooking = getPassengerActiveBooking(user.username);
      const booking = supabaseBooking || localBooking;

      if (cancelled) return;

      if (booking) {
        setActiveBooking(booking);
        setIsLoadingBooking(false);
        return;
      }

      toast.info("No active booking found.");
      navigate("/passenger/book", { replace: true });
    };

    void loadActiveBooking();

    return () => {
      cancelled = true;
    };
  }, [activeBooking, navigate, setActiveBooking, user]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshBooking();
    }, 1800);

    return () => window.clearInterval(timer);
  }, [refreshBooking]);

  useEffect(() => {
    if (!activeBooking?.id) return;
    return subscribeToSupabaseBooking(activeBooking.id, setActiveBooking);
  }, [activeBooking?.id, setActiveBooking]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const start = activeBooking
      ? midpoint(activeBooking.pickupLocation, activeBooking.destination)
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([start.lat, start.lng], 16);

    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      opacity: 0.9,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [activeBooking]);

  useEffect(() => {
    if (!mapRef.current || !activeBooking) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }

    const layer = L.layerGroup().addTo(mapRef.current);
    layerRef.current = layer;

    const pickup = activeBooking.pickupLocation;
    const destination = activeBooking.destination;
    const routePoints: L.LatLngExpression[] = [
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng],
    ];

    L.polyline(routePoints, {
      color: driverFound ? BLUE : "#6B7280",
      weight: driverFound ? 6 : 4,
      opacity: driverFound ? 0.9 : 0.45,
      dashArray: driverFound ? undefined : "8 10",
    }).addTo(layer);

    L.marker([pickup.lat, pickup.lng], { icon: makePinIcon("#16A34A", "P") }).addTo(layer);
    L.marker([destination.lat, destination.lng], { icon: makePinIcon(MAROON, "D") }).addTo(layer);

    if (driverFound) {
      const driverPoint = getDriverPoint(activeBooking);
      L.marker([driverPoint.lat, driverPoint.lng], { icon: makeDriverIcon(), zIndexOffset: 200 }).addTo(layer);
    }

    const bounds = L.latLngBounds(routePoints);
    if (driverFound) {
      const driverPoint = getDriverPoint(activeBooking);
      bounds.extend([driverPoint.lat, driverPoint.lng]);
    }

    mapRef.current.fitBounds(bounds, {
      paddingTopLeft: [42, driverFound ? 185 : 120],
      paddingBottomRight: [42, driverFound ? 120 : 170],
      maxZoom: 17,
    });
  }, [activeBooking, driverFound]);

  if (isLoadingBooking && !activeBooking) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#FFF8E8] px-6">
        <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-sm">
          <p className="font-semibold text-[#4B0F14]">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (!activeBooking) return null;

  const driverName = activeBooking.driverName || "Assigned Driver";
  const vehicleDetails = [
    activeBooking.driverVehicleType || "Tricycle",
    activeBooking.driverPlateNumber,
  ].filter(Boolean).join(" - ");

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-[#FFF8E8]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 z-10 bg-white/45" />

      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pt-10">
        {driverFound ? (
          <button
            onClick={() => navigate("/passenger/ongoing-booking")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-[#4B0F14]" />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}

        {driverFound && (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0756A8] shadow-sm"
              aria-label="Call driver"
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/passenger/chat/${activeBooking.id}`)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0756A8] shadow-sm"
              aria-label="Message driver"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!driverFound ? (
        <div className="absolute inset-x-0 top-[18%] z-20 flex flex-col items-center px-6 text-center">
          <p className="mb-5 text-xl font-black text-[#0756A8]">Finding you a Driver...</p>

          <div className="relative h-44 w-44 animate-pulse">
            <div className="absolute left-3 top-3 h-32 w-32 rounded-full border-[13px] border-[#0756A8] bg-white/10 shadow-[0_12px_35px_rgba(7,86,168,0.18)]" />
            <div className="absolute left-[116px] top-[120px] h-20 w-5 rotate-[-45deg] rounded-full bg-[#0756A8] shadow-[0_10px_25px_rgba(7,86,168,0.22)]" />
          </div>

          <div className="mt-8 rounded-2xl bg-white/90 px-5 py-4 text-left shadow-sm backdrop-blur">
            <p className="text-sm font-bold text-[#111827]">Waiting for nearby drivers</p>
            <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[#5B6472]">
              Your booking request is visible to available drivers. This page will update automatically when one accepts.
            </p>
          </div>

          <button
            onClick={() => setShowCancelDialog(true)}
            className="mt-6 h-12 w-full max-w-[260px] rounded-2xl bg-[#f3f4f6] font-bold text-[#4B0F14] shadow-sm transition-opacity"
            style={{ border: "2px solid #e5e7eb" }}
          >
            Cancel Booking
          </button>
        </div>
      ) : (
        <div className="absolute inset-x-4 top-20 z-20 rounded-3xl bg-white/95 p-5 text-center shadow-lg backdrop-blur">
          <p className="text-lg font-black text-[#0756A8]">Driver Found</p>

          <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#D8E8FF] bg-[#0756A8] text-2xl font-black text-white shadow-sm">
            {getInitials(driverName)}
          </div>

          <h1 className="mt-3 text-xl font-black text-[#111827]">{driverName}</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#0756A8]">
            {vehicleDetails || "Tricycle Driver"}
          </p>
          <p className="mt-1 text-xs text-[#667085]">
            {activeBooking.driverPhone ? activeBooking.driverPhone : "Driver contact will appear once available"}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#F7F9FC] px-3 py-3">
              <Navigation2 className="mx-auto h-4 w-4 text-[#0756A8]" />
              <p className="mt-1 text-[11px] font-bold text-[#111827]">{activeBooking.distance.toFixed(1)} km</p>
            </div>
            <div className="rounded-2xl bg-[#F7F9FC] px-3 py-3">
              <ShieldCheck className="mx-auto h-4 w-4 text-[#16A34A]" />
              <p className="mt-1 text-[11px] font-bold text-[#111827]">Accepted</p>
            </div>
            <div className="rounded-2xl bg-[#F7F9FC] px-3 py-3">
              <p className="text-sm font-black text-[#4B0F14]">P{activeBooking.finalPrice}</p>
              <p className="mt-1 text-[11px] font-bold text-[#111827]">Fare</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/passenger/ongoing-booking")}
            className="mt-4 h-12 w-full rounded-2xl bg-[#4B0F14] font-bold text-[#D4AF37] shadow-sm"
          >
            View Ride Details
          </button>
        </div>
      )}

      {/* ── Cancel Confirm Dialog ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-[9999] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-3xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <DialogPrimitive.Title className="text-lg font-black mb-1" style={{ color: MAROON }}>
              Cancel Booking?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm mb-6" style={{ color: "#6b7280" }}>
              Are you sure you want to cancel your ride request? This action cannot be undone.
            </DialogPrimitive.Description>

            <div className="flex gap-3">
              <button onClick={() => setShowCancelDialog(false)}
                disabled={cancelLoading}
                className="flex-1 h-12 rounded-2xl font-bold text-sm"
                style={{ background: "#f3f4f6", color: "#374151" }}>
                No, Keep it
              </button>
              <button onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="flex-1 h-12 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                style={{ background: MAROON, color: "#fff" }}>
                {cancelLoading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
