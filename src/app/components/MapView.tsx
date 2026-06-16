import { useEffect, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapLocation = {
  lat: number;
  lng: number;
  address?: string;
};

interface MapViewProps {
  pickup?: MapLocation | null;
  destination?: MapLocation | null;
  driverLocation?: MapLocation | null;
  onPickupChange?: (location: { lat: number; lng: number; address: string }) => void;
  onDestinationChange?: (location: { lat: number; lng: number; address: string }) => void;
  height?: string;
  showCurrentLocation?: boolean;
}

declare global {
  interface Window {
    google?: any;
    __arangkadaGoogleMapsPromise?: Promise<any>;
  }
}

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || "";
const DEFAULT_CENTER: MapLocation = { lat: 14.6042, lng: 121.0120, address: "Sta. Mesa, Manila" };

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapView(props: MapViewProps) {
  if (GOOGLE_MAPS_API_KEY) {
    return <GoogleMapView {...props} apiKey={GOOGLE_MAPS_API_KEY} />;
  }

  return <LeafletMapView {...props} />;
}

function GoogleMapView({
  pickup,
  destination,
  driverLocation,
  onPickupChange,
  onDestinationChange,
  height = "400px",
  showCurrentLocation = true,
  apiKey,
}: MapViewProps & { apiKey: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const fallbackLineRef = useRef<any>(null);
  const hasCenteredOnGpsRef = useRef(false);
  const autoPickupSetRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((googleMaps) => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;

        mapRef.current = new googleMaps.maps.Map(mapContainerRef.current, {
          center: pickup || driverLocation || destination || DEFAULT_CENTER,
          zoom: 15,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
        });

        directionsRendererRef.current = new googleMaps.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: "#0B5ED7",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        });
        directionsRendererRef.current.setMap(mapRef.current);

        setIsReady(true);
      })
      .catch((error) => {
        console.warn("Google Maps failed to load:", error);
        setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      clearGoogleMarker(pickupMarkerRef);
      clearGoogleMarker(destinationMarkerRef);
      clearGoogleMarker(driverMarkerRef);
      clearGoogleMarker(currentLocationMarkerRef);
      fallbackLineRef.current?.setMap(null);
      directionsRendererRef.current?.setMap(null);
      mapRef.current = null;
      setIsReady(false);
    };
  }, [apiKey]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !window.google?.maps) return;

    const listener = mapRef.current.addListener("click", async (event: any) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const address = await reverseGeocode(lat, lng);
      const location = { lat, lng, address };

      if (onPickupChange) {
        onPickupChange(location);
      } else if (onDestinationChange) {
        onDestinationChange(location);
      }
    });

    return () => listener.remove();
  }, [isReady, onPickupChange, onDestinationChange]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !window.google?.maps) return;

    upsertGoogleMarker(pickupMarkerRef, pickup, mapRef.current, "Pickup", "P", "#16A34A");
    upsertGoogleMarker(destinationMarkerRef, destination, mapRef.current, "Destination", "D", "#DC2626");
    upsertGoogleMarker(driverMarkerRef, driverLocation, mapRef.current, "Driver", "R", "#4B0F14");
    fitGoogleMap(mapRef.current, [pickup, destination, driverLocation].filter(Boolean) as MapLocation[]);
  }, [isReady, pickup, destination, driverLocation]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !window.google?.maps) return;

    directionsRendererRef.current?.setMap(null);
    directionsRendererRef.current?.setMap(mapRef.current);
    fallbackLineRef.current?.setMap(null);
    fallbackLineRef.current = null;

    if (!pickup || !destination) return;

    const googleMaps = window.google;
    const service = new googleMaps.maps.DirectionsService();

    service.route(
      {
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: googleMaps.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result: any, status: string) => {
        if (status === "OK" && result) {
          directionsRendererRef.current?.setDirections(result);
          return;
        }

        fallbackLineRef.current = new googleMaps.maps.Polyline({
          path: [pickup, destination],
          geodesic: true,
          strokeColor: "#0B5ED7",
          strokeOpacity: 0.85,
          strokeWeight: 5,
          map: mapRef.current,
        });
      }
    );
  }, [isReady, pickup, destination]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !showCurrentLocation || !navigator.geolocation || !window.google?.maps) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };

        upsertGoogleMarker(currentLocationMarkerRef, location, mapRef.current, "Your location", "", "#2563EB");

        if (!hasCenteredOnGpsRef.current && !pickup) {
          mapRef.current.setCenter(location);
          mapRef.current.setZoom(16);
          hasCenteredOnGpsRef.current = true;
        }

        if (!pickup && onPickupChange && !autoPickupSetRef.current) {
          autoPickupSetRef.current = true;
          const address = await reverseGeocode(latitude, longitude);
          onPickupChange({ lat: latitude, lng: longitude, address });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          console.info("Location access not granted. Using Sta. Mesa, Manila.");
        } else {
          console.info("Could not watch location:", error.message);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isReady, pickup, onPickupChange, showCurrentLocation]);

  if (loadFailed) {
    return (
      <div style={{ height, width: "100%" }}>
        <LeafletMapView
          pickup={pickup}
          destination={destination}
          driverLocation={driverLocation}
          onPickupChange={onPickupChange}
          onDestinationChange={onDestinationChange}
          height={height}
          showCurrentLocation={showCurrentLocation}
        />
      </div>
    );
  }

  return <div ref={mapContainerRef} style={{ height, width: "100%", borderRadius: "8px" }} />;
}

function LeafletMapView({
  pickup,
  destination,
  driverLocation,
  onPickupChange,
  onDestinationChange,
  height = "400px",
  showCurrentLocation = true,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const autoPickupSetRef = useRef(false);
  const hasCenteredOnGpsRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 14);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    setIsReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setIsReady(false);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    const map = mapRef.current;
    const handleClick = async (event: L.LeafletMouseEvent) => {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      const address = await reverseGeocode(lat, lng);
      const location = { lat, lng, address };

      if (onPickupChange) {
        onPickupChange(location);
      } else if (onDestinationChange) {
        onDestinationChange(location);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [isReady, onPickupChange, onDestinationChange]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !showCurrentLocation || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        upsertLeafletMarker(currentLocationMarkerRef, location, mapRef.current, "Your current location", createCircleIcon("#2563EB"));

        if (!hasCenteredOnGpsRef.current && !pickup) {
          mapRef.current?.setView([latitude, longitude], 16);
          hasCenteredOnGpsRef.current = true;
        }

        if (!pickup && onPickupChange && !autoPickupSetRef.current) {
          autoPickupSetRef.current = true;
          const address = await reverseGeocode(latitude, longitude);
          onPickupChange({ lat: latitude, lng: longitude, address });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          console.info("Location access not granted. Using Sta. Mesa, Manila.");
        } else {
          console.info("Could not watch location:", error.message);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isReady, pickup, onPickupChange, showCurrentLocation]);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    upsertLeafletMarker(pickupMarkerRef, pickup, mapRef.current, "Pickup", createPinIcon("green"));
    upsertLeafletMarker(destinationMarkerRef, destination, mapRef.current, "Destination", createPinIcon("red"));
    upsertLeafletMarker(driverMarkerRef, driverLocation, mapRef.current, "Driver location", createCircleIcon("#4B0F14", "R"));

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (pickup && destination) {
      routeLineRef.current = L.polyline(
        [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng],
        ],
        { color: "#0B5ED7", weight: 5, opacity: 0.85 }
      ).addTo(mapRef.current);
    }

    fitLeafletMap(mapRef.current, [pickup, destination, driverLocation].filter(Boolean) as MapLocation[]);
  }, [isReady, pickup, destination, driverLocation]);

  return <div ref={mapContainerRef} style={{ height, width: "100%", borderRadius: "8px" }} />;
}

function loadGoogleMaps(apiKey: string): Promise<any> {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__arangkadaGoogleMapsPromise) return window.__arangkadaGoogleMapsPromise;

  window.__arangkadaGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-arangkada-google-maps]");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.dataset.arangkadaGoogleMaps = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Unable to load Google Maps JavaScript API"));
    document.head.appendChild(script);
  });

  return window.__arangkadaGoogleMapsPromise;
}

function upsertGoogleMarker(
  markerRef: MutableRefObject<any>,
  location: MapLocation | null | undefined,
  map: any,
  title: string,
  label: string,
  color: string
) {
  const googleMaps = window.google;

  if (!location || !googleMaps?.maps) {
    clearGoogleMarker(markerRef);
    return;
  }

  const position = { lat: location.lat, lng: location.lng };

  if (markerRef.current) {
    markerRef.current.setPosition(position);
    return;
  }

  markerRef.current = new googleMaps.maps.Marker({
    position,
    map,
    title,
    label: label
      ? {
          text: label,
          color: "#FFFFFF",
          fontSize: "12px",
          fontWeight: "700",
        }
      : undefined,
    icon: {
      path: googleMaps.maps.SymbolPath.CIRCLE,
      scale: label ? 13 : 9,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 3,
    },
  });
}

function clearGoogleMarker(markerRef: MutableRefObject<any>) {
  if (markerRef.current) {
    markerRef.current.setMap(null);
    markerRef.current = null;
  }
}

function fitGoogleMap(map: any, locations: MapLocation[]) {
  if (!locations.length || !window.google?.maps) return;

  if (locations.length === 1) {
    map.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
    map.setZoom(15);
    return;
  }

  const bounds = new window.google.maps.LatLngBounds();
  locations.forEach(location => bounds.extend({ lat: location.lat, lng: location.lng }));
  map.fitBounds(bounds, 72);
}

function upsertLeafletMarker(
  markerRef: MutableRefObject<L.Marker | null>,
  location: MapLocation | null | undefined,
  map: L.Map,
  label: string,
  icon: L.DivIcon | L.Icon
) {
  if (!location) {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    return;
  }

  if (markerRef.current) {
    markerRef.current.setLatLng([location.lat, location.lng]);
    markerRef.current.bindPopup(`<b>${label}</b><br>${escapeHtml(location.address || "")}`);
    return;
  }

  markerRef.current = L.marker([location.lat, location.lng], { icon });
  markerRef.current.bindPopup(`<b>${label}</b><br>${escapeHtml(location.address || "")}`);
  markerRef.current.addTo(map);
}

function fitLeafletMap(map: L.Map, locations: MapLocation[]) {
  if (!locations.length) return;

  if (locations.length === 1) {
    map.setView([locations[0].lat, locations[0].lng], 15);
    return;
  }

  const bounds = L.latLngBounds(locations.map(location => [location.lat, location.lng] as [number, number]));
  map.fitBounds(bounds, { padding: [50, 50] });
}

function createPinIcon(color: "green" | "red"): L.Icon {
  const iconName = color === "green" ? "marker-icon-2x-green.png" : "marker-icon-2x-red.png";

  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/${iconName}`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function createCircleIcon(color: string, label = ""): L.DivIcon {
  return L.divIcon({
    className: "map-circle-marker",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:800;">${escapeHtml(label)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      const firstResult = result.results?.[0]?.formatted_address;
      if (firstResult) return firstResult;
    } catch {
      // Fall back to coordinates or OpenStreetMap below.
    }
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || formatCoordinates(lat, lng);
  } catch {
    return formatCoordinates(lat, lng);
  }
}

function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
