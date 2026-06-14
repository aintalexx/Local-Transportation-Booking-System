import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapViewProps {
  pickup?: { lat: number; lng: number; address?: string } | null;
  destination?: { lat: number; lng: number; address?: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  onPickupChange?: (location: { lat: number; lng: number; address: string }) => void;
  onDestinationChange?: (location: { lat: number; lng: number; address: string }) => void;
  height?: string;
  showCurrentLocation?: boolean;
}

export default function MapView({
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
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);

  // Sta. Mesa, Manila default center
  const defaultCenter: [number, number] = [14.6042, 121.0120];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(defaultCenter, 14);
    mapRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Get current location
    if (showCurrentLocation) {
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });

          // Add current location marker (blue circle)
          const blueIcon = L.divIcon({
            className: "current-location-marker",
            html: '<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const marker = L.marker([latitude, longitude], { icon: blueIcon }).addTo(map);
          marker.bindPopup("Your Current Location");
          currentLocationMarkerRef.current = marker;

          // Center map on current location
          map.setView([latitude, longitude], 15);

          // If no pickup is set, use current location as pickup
          if (!pickup && onPickupChange) {
            reverseGeocode(latitude, longitude).then((address) => {
              onPickupChange({ lat: latitude, lng: longitude, address });
            });
          }
        },
        (error) => {
          // Only log actual errors, not user permission choices
          if (error.code === error.PERMISSION_DENIED) {
            console.info("Location access not granted. Using default location (Sta. Mesa, Manila).");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            console.warn("Location information is unavailable. Using default location.");
          } else if (error.code === error.TIMEOUT) {
            console.warn("Location request timed out. Using default location.");
          } else {
            console.warn("Could not get location:", error.message || "Unknown error");
          }
          // Map will stay at default location (Sta. Mesa, Manila)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update pickup marker
  useEffect(() => {
    if (!mapRef.current || !pickup) return;

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      const greenIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([pickup.lat, pickup.lng], { icon: greenIcon }).addTo(mapRef.current);
      marker.bindPopup(`<b>Pickup:</b><br>${pickup.address}`);
      pickupMarkerRef.current = marker;
    }

    // Fit bounds if both markers exist
    if (pickup && destination) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pickup]);

  // Update destination marker
  useEffect(() => {
    if (!mapRef.current || !destination) return;

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    } else {
      const redIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([destination.lat, destination.lng], { icon: redIcon }).addTo(mapRef.current);
      marker.bindPopup(`<b>Destination:</b><br>${destination.address}`);
      destinationMarkerRef.current = marker;
    }

    // Fit bounds if both markers exist
    if (pickup && destination) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [destination]);

  // Update driver location marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (!driverLocation) {
      // Remove driver marker if no driver location
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
      // Create a custom car icon for the driver
      const carIcon = L.divIcon({
        className: "driver-marker",
        html: '<div style="background-color: #10B981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">🚗</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker([driverLocation.lat, driverLocation.lng], { icon: carIcon }).addTo(mapRef.current);
      marker.bindPopup("<b>Driver Location</b>");
      driverMarkerRef.current = marker;
    }
  }, [driverLocation]);

  return <div ref={mapContainerRef} style={{ height, width: "100%", borderRadius: "8px" }} />;
}

// Simple reverse geocoding using Nominatim (OpenStreetMap)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
