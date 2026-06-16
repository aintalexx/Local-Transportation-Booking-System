export type LatLngPoint = {
  lat: number;
  lng: number;
  address?: string;
};

export type DriverStatus = "available" | "busy" | "offline";

export type DriverCandidate = {
  username: string;
  name: string;
  phone: string;
  vehicleType: "Tricycle" | "E-Bike" | "Motorcycle";
  plateNumber: string;
  rating: number;
  completedTrips: number;
  location: LatLngPoint;
  status: DriverStatus;
  averageSpeedKph: number;
};

export type DriverMatch = {
  driver: DriverCandidate;
  distanceKm: number;
  etaMinutes: number;
  score: number;
};

export const DEMO_DRIVERS: DriverCandidate[] = [
  {
    username: "driver_pedro",
    name: "Pedro Santos",
    phone: "09171234567",
    vehicleType: "Tricycle",
    plateNumber: "ABC 123",
    rating: 4.9,
    completedTrips: 842,
    location: { lat: 14.6028, lng: 121.0106, address: "PUP Sta. Mesa" },
    status: "available",
    averageSpeedKph: 18,
  },
  {
    username: "driver_maria",
    name: "Maria Garcia",
    phone: "09181234567",
    vehicleType: "E-Bike",
    plateNumber: "EBC 456",
    rating: 4.8,
    completedTrips: 624,
    location: { lat: 14.6074, lng: 121.0141, address: "Pureza" },
    status: "available",
    averageSpeedKph: 16,
  },
  {
    username: "driver_jose",
    name: "Jose Reyes",
    phone: "09191234567",
    vehicleType: "Tricycle",
    plateNumber: "DEF 789",
    rating: 4.7,
    completedTrips: 551,
    location: { lat: 14.5997, lng: 121.0088, address: "V. Mapa" },
    status: "available",
    averageSpeedKph: 18,
  },
  {
    username: "driver_liza",
    name: "Liza Cruz",
    phone: "09201234567",
    vehicleType: "Motorcycle",
    plateNumber: "MC 2145",
    rating: 4.95,
    completedTrips: 1104,
    location: { lat: 14.6048, lng: 121.0190, address: "SM City Sta. Mesa" },
    status: "available",
    averageSpeedKph: 24,
  },
  {
    username: "driver_anton",
    name: "Anton Dela Cruz",
    phone: "09211234567",
    vehicleType: "Tricycle",
    plateNumber: "GHI 321",
    rating: 4.6,
    completedTrips: 388,
    location: { lat: 14.6112, lng: 121.0207, address: "Pureza LRT" },
    status: "busy",
    averageSpeedKph: 18,
  },
];

export function haversineDistanceKm(origin: LatLngPoint, destination: LatLngPoint): number {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(destination.lat - origin.lat);
  const lngDelta = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return roundToOneDecimal(earthRadiusKm * c);
}

export function estimateRouteDistanceKm(origin: LatLngPoint, destination: LatLngPoint): number {
  const directDistance = haversineDistanceKm(origin, destination);
  const cityRoadFactor = 1.28;
  return Math.max(0.4, roundToOneDecimal(directDistance * cityRoadFactor));
}

export function estimateTravelMinutes(distanceKm: number, averageSpeedKph = 18): number {
  const safeSpeed = Math.max(8, averageSpeedKph);
  const minutes = (distanceKm / safeSpeed) * 60;
  return Math.max(2, Math.ceil(minutes));
}

export function findDriverMatches(
  pickup: LatLngPoint,
  options: {
    vehicleType?: string;
    limit?: number;
    drivers?: DriverCandidate[];
  } = {}
): DriverMatch[] {
  const limit = options.limit ?? 3;
  const vehicleType = normalizeVehicleType(options.vehicleType);
  const drivers = options.drivers ?? DEMO_DRIVERS;

  return drivers
    .filter(driver => driver.status === "available")
    .filter(driver => !vehicleType || normalizeVehicleType(driver.vehicleType) === vehicleType)
    .map(driver => {
      const distanceKm = haversineDistanceKm(pickup, driver.location);
      const etaMinutes = estimateTravelMinutes(distanceKm, driver.averageSpeedKph);
      const ratingPenalty = Math.max(0, 5 - driver.rating);
      const experienceBonus = Math.min(driver.completedTrips / 1000, 1);
      const score = distanceKm * 0.68 + etaMinutes * 0.22 + ratingPenalty * 0.5 - experienceBonus * 0.2;

      return {
        driver,
        distanceKm,
        etaMinutes,
        score: roundToTwoDecimals(score),
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

export function findBestDriver(
  pickup: LatLngPoint,
  options: {
    vehicleType?: string;
    drivers?: DriverCandidate[];
  } = {}
): DriverMatch | null {
  return findDriverMatches(pickup, { ...options, limit: 1 })[0] ?? null;
}

function normalizeVehicleType(value?: string): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
