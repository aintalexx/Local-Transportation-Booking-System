import type { LatLngPoint } from "./rideMatching";

export type DemoLocation = LatLngPoint & {
  id: string;
  name: string;
};

// Demo pickup points stay inside the project scope: Sta. Mesa, Manila.
export const SANTA_MESA_PICKUP_POINTS: DemoLocation[] = [
  {
    id: "pup-main",
    name: "PUP Main Gate",
    lat: 14.5995,
    lng: 121.0114,
    address: "PUP Main Gate, Sta. Mesa",
  },
  {
    id: "vmapa-lrt",
    name: "V. Mapa LRT Station",
    lat: 14.5992,
    lng: 121.0083,
    address: "V. Mapa LRT Station, Sta. Mesa",
  },
  {
    id: "pureza-lrt",
    name: "Pureza LRT Station",
    lat: 14.6099,
    lng: 121.0199,
    address: "Pureza LRT Station, Sta. Mesa",
  },
  {
    id: "sta-mesa-market",
    name: "Sta. Mesa Market",
    lat: 14.6042,
    lng: 121.0119,
    address: "Sta. Mesa Market, Manila",
  },
];
