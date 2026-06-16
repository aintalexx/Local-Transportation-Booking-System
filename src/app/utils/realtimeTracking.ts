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
