import { supabase } from "../lib/supabase";

export type DriverLocationPayload = {
  bookingId: string;
  driverUsername: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
};

export type RealtimeDriverLocation = {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string;
};

export type AdminLiveDriverLocation = RealtimeDriverLocation & {
  bookingId: string;
  driverUsername: string;
};

type DriverLocationRow = {
  booking_id: string;
  driver_username: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updated_at?: string;
};

export async function publishDriverLocation(payload: DriverLocationPayload): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from("driver_locations")
    .upsert(
      {
        booking_id: payload.bookingId,
        driver_username: payload.driverUsername,
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading ?? null,
        speed: payload.speed ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" }
    );

  if (error) {
    console.info("Driver GPS was kept local because Supabase tracking is not ready:", error.message);
    return false;
  }

  return true;
}

export async function getLatestDriverLocations(): Promise<AdminLiveDriverLocation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("driver_locations")
    .select("booking_id, driver_username, lat, lng, heading, speed, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.info("Live driver locations are unavailable:", error.message);
    return [];
  }

  const latestByDriver = new Map<string, AdminLiveDriverLocation>();
  (data as DriverLocationRow[] | null)?.forEach((row) => {
    if (!row.driver_username || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return;

    const key = row.driver_username.trim().toLowerCase();
    if (latestByDriver.has(key)) return;

    latestByDriver.set(key, {
      bookingId: row.booking_id,
      driverUsername: row.driver_username,
      lat: row.lat,
      lng: row.lng,
      heading: row.heading,
      speed: row.speed,
      updatedAt: row.updated_at,
    });
  });

  return Array.from(latestByDriver.values());
}

export function subscribeToAllDriverLocations(onChange: () => void): () => void {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("admin-live-driver-locations")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "driver_locations",
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToDriverLocation(
  bookingId: string,
  onLocation: (location: RealtimeDriverLocation) => void
): () => void {
  if (!supabase || !bookingId) return () => undefined;

  const channel = supabase
    .channel(`driver-location:${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "driver_locations",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        const row = payload.new as DriverLocationRow | null;
        if (!row || !Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return;

        onLocation({
          lat: row.lat,
          lng: row.lng,
          heading: row.heading,
          speed: row.speed,
          updatedAt: row.updated_at,
        });
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
