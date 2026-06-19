import type { BookingData } from "./bookingDatabase";
import type { LatLngPoint } from "./rideMatching";

export type BookingFlowStatus =
  | "idle"
  | "selecting_location"
  | "route_preview"
  | "finding_driver"
  | "driver_found"
  | "driver_arriving"
  | "driver_to_pickup"
  | "passenger_picked_up"
  | "driver_arrived"
  | "ride_started"
  | "ride_ongoing"
  | "ride_completed"
  | "cancelled";

export type RoutePhase = "driver_to_pickup" | "pickup_to_destination" | "preview";

export function getBookingFlowStatus(status: BookingData["status"] | undefined): BookingFlowStatus {
  switch (status) {
    case "pending":
      return "finding_driver";
    case "accepted":
      return "driver_found";
    case "driver_arriving":
    case "en_route":
      return "driver_to_pickup";
    case "arrived":
      return "driver_arrived";
    case "passenger_picked_up":
      return "ride_started";
    case "in_progress":
      return "ride_ongoing";
    case "completed":
      return "ride_completed";
    case "finding_driver":
    case "driver_found":
    case "driver_to_pickup":
    case "driver_arrived":
    case "ride_started":
    case "ride_ongoing":
    case "ride_completed":
    case "cancelled":
      return status;
    default:
      return "idle";
  }
}

export function createRoutePoints(
  start: LatLngPoint,
  end: LatLngPoint,
  steps = 24
): LatLngPoint[] {
  const safeSteps = Math.max(2, steps);

  return Array.from({ length: safeSteps }, (_, index) => {
    const progress = index / (safeSteps - 1);
    return {
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress,
      address: index === 0 ? start.address : index === safeSteps - 1 ? end.address : undefined,
    };
  });
}

export function getRoutePoint(route: LatLngPoint[], index: number): LatLngPoint {
  if (!route.length) {
    return { lat: 14.6042, lng: 121.0120, address: "Sta. Mesa, Manila" };
  }

  return route[Math.min(Math.max(index, 0), route.length - 1)];
}

export function getRouteProgressPercent(currentIndex: number, routeLength: number): number {
  if (routeLength <= 1) return 100;
  return Math.min(100, Math.round((currentIndex / (routeLength - 1)) * 100));
}
