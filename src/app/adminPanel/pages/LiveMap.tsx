import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Navigation, MapPin, Layers,
  RefreshCw, ZoomIn, ZoomOut, Crosshair, ArrowUpRight,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useNavigate } from "../context/NavigationContext";
import {
  BTN_OUTLINE_SM, BTN_SECONDARY, BTN_ICON_SM,
  CARD, CARD_HEADER, SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE,
} from "../lib/ui";
import type { MapDriverTarget } from "../context/NavigationContext";
import {
  getLatestDriverLocations,
  subscribeToAllDriverLocations,
  type AdminLiveDriverLocation,
} from "../../utils/realtimeTracking";
import {
  getApprovedOnlineDriverProfiles,
  subscribeToDriverProfilePresence,
  type LiveDriverProfile,
} from "../../utils/supabaseProfiles";

const MAROON = "#6B0E1A";
const GOLD   = "#C49A1A";

type MarkerStatus = "Active" | "Idle" | "Ongoing";

interface MarkerData {
  id: string; type: "driver";
  name: string; detail: string; status: MarkerStatus;
  lat: number; lng: number; route?: string; phone?: string;
}

// Unified marker color by status
const MARKER_COLOR: Record<MarkerStatus, string> = {
  Active:  "#15803d",
  Idle:    "#d97706",
  Ongoing: MAROON,
};
const STATUS_DOT_COLOR: Record<MarkerStatus, string> = {
  Active:  "#22c55e",
  Idle:    "#f59e0b",
  Ongoing: GOLD,
};
const STATUS_LABEL: Record<MarkerStatus, string> = {
  Active:  "Active",
  Idle:    "Idle",
  Ongoing: "On Ride",
};

const normalizeKey = (value?: string | null) => value?.trim().toLowerCase() || "";
const normalizePhone = (value?: string | null) => value?.replace(/\D/g, "") || "";

const formatLastUpdate = (updatedAt?: string) => {
  if (!updatedAt) return "Live GPS update";

  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return "Live GPS update";

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return "Updated just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `Updated ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;

  return `Updated ${Math.floor(hours / 24)} day ago`;
};

const isValidCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

function locationMatchesTarget(location: AdminLiveDriverLocation, target: MapDriverTarget) {
  const locationUsername = normalizeKey(location.driverUsername);
  const locationPhone = normalizePhone(location.driverUsername);
  const targetId = normalizeKey(target.id);
  const targetPhone = normalizePhone(target.phone);

  return Boolean(
    (targetId && locationUsername === targetId) ||
    (targetPhone && locationPhone === targetPhone) ||
    (targetPhone && locationPhone.includes(targetPhone)) ||
    (targetPhone && locationUsername.includes(targetPhone))
  );
}

function findDriverLocation(
  target: MapDriverTarget,
  locations: AdminLiveDriverLocation[]
) {
  return locations.find(location =>
    isValidCoordinate(location.lat, location.lng) && locationMatchesTarget(location, target)
  );
}

function buildDriverMarkers(
  profiles: LiveDriverProfile[],
  locations: AdminLiveDriverLocation[]
): MarkerData[] {
  const latestLocations = new Map<string, AdminLiveDriverLocation>();

  locations.forEach((location) => {
    if (!isValidCoordinate(location.lat, location.lng)) return;

    const usernameKey = normalizeKey(location.driverUsername);
    if (usernameKey && !latestLocations.has(usernameKey)) latestLocations.set(usernameKey, location);

    const phoneKey = normalizePhone(location.driverUsername);
    if (phoneKey && !latestLocations.has(phoneKey)) latestLocations.set(phoneKey, location);
  });

  return profiles
    .filter((profile) => profile.is_online && profile.approval_status === "approved")
    .map((profile) => {
      const matchingKeys = [
        normalizeKey(profile.username),
        normalizePhone(profile.phone),
        normalizeKey(profile.id),
      ].filter(Boolean);
      const location = matchingKeys
        .map((key) => latestLocations.get(key))
        .find(Boolean);

      if (!location) return null;

      const vehicle = profile.vehicle_type?.trim() || "Tricycle";
      const plate = profile.plate_number?.trim();

      return {
        id: profile.id,
        type: "driver" as const,
        name: profile.full_name || profile.username || "Driver",
        detail: plate ? `${vehicle} - Plate ${plate}` : vehicle,
        status: "Active" as const,
        lat: location.lat,
        lng: location.lng,
        route: formatLastUpdate(location.updatedAt),
        phone: profile.phone || undefined,
      };
    })
    .filter((marker): marker is MarkerData => Boolean(marker));
}

// Tricycle Icon SVG component for React
function TricycleIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 18l3-7h6l3 7" />
      <path d="M8 11l-2-4h-2" />
      <path d="M11 11v-3h3v3" />
      <path d="M9 11h7v4H9z" />
      <circle cx="12.5" cy="18" r="2" />
    </svg>
  );
}

// Create custom leaflet DivIcon inside standard HTML/CSS structure
const createCustomIcon = (m: MarkerData, isSelected: boolean) => {
  const bg = MARKER_COLOR[m.status];
  const dotBg = STATUS_DOT_COLOR[m.status];

  const html = `
    <div style="position: relative;">
      <div style="width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; background: ${bg}; color: white; transition: all 150ms;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide"><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M6 18l3-7h6l3 7" /><path d="M8 11l-2-4h-2" /><path d="M11 11v-3h3v3" /><path d="M9 11h7v4H9z" /><circle cx="12.5" cy="18" r="2" /></svg>
      </div>
      <span style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; background: ${dotBg}; display: inline-block;"></span>
      ${isSelected ? '<span style="position: absolute; top: -10px; left: -10px; width: 56px; height: 56px; border-radius: 50%; border: 2px solid #6B0E1A; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.3; pointer-events: none;"></span>' : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-map-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

export function LiveMap() {
  const { navigate, mapDriverTarget } = useNavigate();
  const [selected, setSelected]       = useState<MarkerData | null>(null);
  const [markers, setMarkers]         = useState<MarkerData[]>([]);
  const [showDrivers, setShowDrivers] = useState(true);
  const [zoom, setZoom]               = useState(15);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [driverLocationMissing, setDriverLocationMissing] = useState(false);

  const visible = useMemo(() => showDrivers ? markers : [], [showDrivers, markers]);
  const syncLabel = lastSyncedAt
    ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Waiting for live GPS";

  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markerInstancesRef = useRef<Map<string, L.Marker>>(new Map());

  const loadLiveDrivers = useCallback(async (notify = false) => {
    setRefreshing(true);

    try {
      const [profiles, locations] = await Promise.all([
        getApprovedOnlineDriverProfiles(),
        getLatestDriverLocations(),
      ]);

      let nextMarkers = buildDriverMarkers(profiles, locations);

      if (mapDriverTarget) {
        const targetPhone = normalizePhone(mapDriverTarget.phone);
        const existingMarker = nextMarkers.find(marker =>
          marker.id === mapDriverTarget.id ||
          Boolean(targetPhone && normalizePhone(marker.phone) === targetPhone)
        );
        const targetLocation = findDriverLocation(mapDriverTarget, locations);

        if (existingMarker) {
          setSelected(existingMarker);
          setDriverLocationMissing(false);
        } else if (targetLocation) {
          const targetMarker: MarkerData = {
            id: `selected-${mapDriverTarget.id}`,
            type: "driver",
            name: mapDriverTarget.name,
            detail: "Selected driver - real GPS location",
            status: "Active",
            lat: targetLocation.lat,
            lng: targetLocation.lng,
            route: formatLastUpdate(targetLocation.updatedAt),
            phone: mapDriverTarget.phone,
          };
          nextMarkers = [targetMarker, ...nextMarkers];
          setSelected(targetMarker);
          setShowDrivers(true);
          setDriverLocationMissing(false);
        } else {
          setSelected(null);
          setDriverLocationMissing(true);
        }
      } else {
        setDriverLocationMissing(false);
      }

      setMarkers(nextMarkers);
      setLastSyncedAt(new Date().toISOString());

      if (notify) {
        toast.success("Map refreshed", {
          description: `${nextMarkers.length} approved online driver${nextMarkers.length === 1 ? "" : "s"} with live GPS.`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.info("Live map refresh failed:", error);
      if (notify) toast.error("Unable to refresh live map");
    } finally {
      setLoadingDrivers(false);
      setRefreshing(false);
    }
  }, [mapDriverTarget]);

  useEffect(() => {
    void loadLiveDrivers();

    const unsubscribeLocations = subscribeToAllDriverLocations(() => {
      void loadLiveDrivers();
    });
    const unsubscribeProfiles = subscribeToDriverProfilePresence(() => {
      void loadLiveDrivers();
    });

    return () => {
      unsubscribeLocations();
      unsubscribeProfiles();
    };
  }, [loadLiveDrivers]);

  useEffect(() => {
    if (selected && !markers.some(marker => marker.id === selected.id)) {
      setSelected(null);
    }
  }, [markers, selected]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([14.5995, 121.0118], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    setMapInstance(map);

    return () => {
      map.remove();
      setMapInstance(null);
    };
  }, []);

  // Sync zoom changes to map
  useEffect(() => {
    if (mapInstance && mapInstance.getZoom() !== zoom) {
      mapInstance.setZoom(zoom);
    }
  }, [zoom, mapInstance]);

  // Sync manual map zoom actions back to state
  useEffect(() => {
    if (!mapInstance) return;

    const handleZoomEnd = () => {
      setZoom(mapInstance.getZoom());
    };

    mapInstance.on("zoomend", handleZoomEnd);
    return () => {
      mapInstance.off("zoomend", handleZoomEnd);
    };
  }, [mapInstance]);

  // Pan to selected marker
  useEffect(() => {
    if (mapInstance && selected) {
      mapInstance.setView([selected.lat, selected.lng], 16, { animate: true });
    }
  }, [selected, mapInstance]);

  // Manage Leaflet marker cycles
  useEffect(() => {
    if (!mapInstance) return;

    const currentIds = new Set(visible.map(m => m.id));

    // Remove obsolete markers
    markerInstancesRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markerInstancesRef.current.delete(id);
      }
    });

    // Create or update active markers
    visible.forEach((m) => {
      const isSelected = selected?.id === m.id;
      const icon = createCustomIcon(m, isSelected);
      const existingMarker = markerInstancesRef.current.get(m.id);

      if (existingMarker) {
        existingMarker.setLatLng([m.lat, m.lng]);
        existingMarker.setIcon(icon);
      } else {
        const popupContent = `
          <div class="text-xs" style="font-family: Nunito, sans-serif;">
            <p class="font-bold text-sm" style="color: ${MAROON};">${m.name}</p>
            <p class="text-muted-foreground mt-0.5">${m.detail}</p>
            ${m.route ? `<p class="font-semibold mt-1" style="color: ${GOLD};">${m.route}</p>` : ""}
          </div>
        `;

        const marker = L.marker([m.lat, m.lng], { icon })
          .addTo(mapInstance)
          .bindPopup(popupContent)
          .on("click", () => {
            setSelected(prev => prev?.id === m.id ? null : m);
          });

        markerInstancesRef.current.set(m.id, marker);
      }
    });
  }, [visible, selected, mapInstance]);

  function handleRefresh() {
    void loadLiveDrivers(true);
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Live Map Monitoring</h1>
          <p className={PAGE_SUBTITLE}>Real-time approved online driver positions - Sta. Mesa, Manila Service Area</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {loadingDrivers ? "Loading GPS" : "GPS Live"}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`${BTN_OUTLINE_SM} disabled:opacity-60`}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Layer toggles + legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Layers size={12} /> Layers:
        </span>
        <button
          onClick={() => setShowDrivers(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 ${
            showDrivers
              ? "border-primary/40 text-primary bg-primary/8 shadow-sm"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <TricycleIcon size={12} />
          Active Tricycles ({markers.length})
        </button>

        {/* Legend */}
        <div className="ml-auto hidden md:flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Active</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Idle</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: MAROON }} /> On Ride</span>
        </div>
      </div>

      {driverLocationMissing && mapDriverTarget && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Driver location not available for {mapDriverTarget.name}. No real GPS coordinates exist for this driver yet.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Map canvas ── */}
        <div className={`${CARD} lg:col-span-2 overflow-hidden`} style={{ minHeight: 460 }}>
          <div className="relative w-full h-[460px] z-0">
            <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#E8E4DC" }} />

            {/* Zoom controls */}
            <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl overflow-hidden shadow-md flex flex-col z-[1000]">
              {[
                { icon: ZoomIn,    label: "Zoom in",   action: () => setZoom(z => Math.min(z + 1, 18)) },
                { icon: ZoomOut,   label: "Zoom out",  action: () => setZoom(z => Math.max(z - 1, 13)) },
                { icon: Crosshair, label: "Recenter",  action: () => { setZoom(15); setSelected(null); toast.info("Map recentered", { duration: 1500 }); } },
              ].map(({ icon: Icon, label, action }, i, arr) => (
                <div key={label}>
                  <button onClick={action} className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-muted hover:text-primary transition-colors" title={label}>
                    <Icon size={14} />
                  </button>
                  {i < arr.length - 1 && <div className="h-px bg-border" />}
                </div>
              ))}
            </div>

            {/* Map attribution */}
            <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 z-[1000]">
              <p className="text-[9px] font-semibold text-muted-foreground">
                Sta. Mesa, Manila · OpenStreetMap · Zoom {zoom}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-4">
          {/* Active vehicles list */}
          <div className={CARD}>
            <div className={CARD_HEADER}>
              <div>
                <h3 className={SECTION_TITLE}>Active Vehicles</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{markers.length} tricycles tracked - {syncLabel}</p>
              </div>
            </div>
            <div className="divide-y divide-border overflow-y-auto" style={{ maxHeight: 220 }}>
              {markers.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <MapPin size={18} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    {loadingDrivers ? "Loading live driver positions" : "No approved online drivers with live GPS yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Demo markers are hidden. Drivers appear here only after approval, going online, and sending GPS.
                  </p>
                </div>
              ) : markers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(selected?.id === m.id ? null : m)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selected?.id === m.id ? "bg-primary/[0.06] border-l-2 border-primary" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: MARKER_COLOR[m.status] }}>
                    <TricycleIcon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{m.detail}</p>
                  </div>
                  <span className="text-xs font-semibold shrink-0" style={{ color: STATUS_DOT_COLOR[m.status] }}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected marker detail */}
          {selected ? (
            <div className={CARD}>
              <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className={SECTION_TITLE}>Tricycle Detail</h3>
                <button onClick={() => setSelected(null)} className={`${BTN_ICON_SM} hover:text-foreground`} title="Close">
                  ✕
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ background: MARKER_COLOR[selected.status] }}>
                    <TricycleIcon size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selected.detail}</p>
                  </div>
                </div>

                {selected.route && (
                  <div className="flex items-center gap-2 text-xs text-foreground bg-muted/50 border border-border/60 rounded-lg px-3 py-2 mb-2">
                    <Navigation size={11} style={{ color: MAROON }} />
                    <span className="font-semibold">{selected.route}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Position: {selected.lat.toFixed(5)}°N, {selected.lng.toFixed(5)}°E
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                    style={{
                      background: selected.status === "Active" ? "#f0fdf4" : selected.status === "Ongoing" ? "#fef9e8" : "#fef3c7",
                      borderColor: selected.status === "Active" ? "#bbf7d0" : selected.status === "Ongoing" ? "#fde68a" : "#fde68a",
                      color: selected.status === "Active" ? "#15803d" : selected.status === "Ongoing" ? MAROON : "#d97706",
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT_COLOR[selected.status] }} />
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>

                <button onClick={() => navigate("drivers")} className={`${BTN_SECONDARY} w-full justify-center`}>
                  View Driver Profile <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-dashed border-border rounded-xl p-5 text-center">
              <MapPin size={20} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground font-medium">Click a marker or vehicle to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
