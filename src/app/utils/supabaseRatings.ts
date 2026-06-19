import { supabase } from "../lib/supabase";
import type { BookingData } from "./bookingDatabase";
import { getCurrentSupabaseUserId } from "./supabaseProfiles";
import type { UserData } from "./userDatabase";

export type DriverFeedback = {
  id: string;
  rating: number;
  feedback: string;
  createdAt: string;
};

export type DriverRatingSummary = {
  driverId: string | null;
  averageRating: number;
  totalRatings: number;
  recentFeedback: DriverFeedback[];
};

export type RatingRow = {
  id: string;
  booking_id: string;
  passenger_id: string;
  driver_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
};

export async function getBookingRating(bookingId: string): Promise<RatingRow | null> {
  if (!supabase || !isUuid(bookingId)) return null;

  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as RatingRow;
}

export async function submitDriverRating(input: {
  booking: BookingData;
  passenger: UserData;
  rating: number;
  feedback?: string;
}): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: "Supabase is not configured." };
  }

  if (!isUuid(input.booking.id)) {
    return { success: false, message: "Only online completed rides can be rated." };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { success: false, message: "Please select a rating from 1 to 5 stars." };
  }

  if (input.booking.status !== "completed" && input.booking.status !== "ride_completed") {
    return { success: false, message: "You can only rate completed rides." };
  }

  const passengerId = input.passenger.supabaseId || await getCurrentSupabaseUserId();
  if (!passengerId) {
    return { success: false, message: "Please login again before rating this ride." };
  }

  if (input.booking.passengerUsername !== passengerId) {
    return { success: false, message: "You can only rate your own completed booking." };
  }

  if (!input.booking.driverUsername || !isUuid(input.booking.driverUsername)) {
    return { success: false, message: "This completed ride has no assigned driver to rate." };
  }

  const existing = await getBookingRating(input.booking.id);
  if (existing) {
    return { success: false, message: "You already rated this completed ride." };
  }

  const { error } = await supabase
    .from("ratings")
    .insert({
      booking_id: input.booking.id,
      passenger_id: passengerId,
      driver_id: input.booking.driverUsername,
      rating: input.rating,
      feedback: input.feedback?.trim() || null,
      created_at: new Date().toISOString(),
    });

  if (error) {
    const message = error.code === "23505"
      ? "You already rated this completed ride."
      : error.message || "Unable to submit rating.";
    return { success: false, message };
  }

  return { success: true, message: "Thank you for rating your driver." };
}

export async function getDriverRatingSummary(user: UserData): Promise<DriverRatingSummary> {
  const empty = getEmptyRatingSummary();
  if (!supabase) return empty;

  const driverId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!driverId) {
    return getDriverRatingSummaryByCredentials(user);
  }

  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    const credentialSummary = await getDriverRatingSummaryByCredentials(user);
    return credentialSummary.totalRatings > 0 ? credentialSummary : { ...empty, driverId };
  }

  return buildRatingSummary(driverId, data as RatingRow[]);
}

export async function getDriverRatingSummaryByCredentials(user: UserData): Promise<DriverRatingSummary> {
  const empty = getEmptyRatingSummary();
  if (!supabase || !user.phoneNumber || !user.password) return empty;

  const { data, error } = await supabase.rpc("get_driver_rating_summary", {
    p_driver_phone: user.phoneNumber,
    p_driver_password: user.password,
  });

  if (error || !data) return empty;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return empty;

  return {
    driverId: row.driver_id || null,
    averageRating: Number(row.average_rating || 0),
    totalRatings: Number(row.total_ratings || 0),
    recentFeedback: normalizeRecentFeedback(row.recent_feedback),
  };
}

export async function getAllDriverRatingSummaries(): Promise<Record<string, DriverRatingSummary>> {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return {};

  const grouped = new Map<string, RatingRow[]>();
  (data as RatingRow[]).forEach((rating) => {
    const rows = grouped.get(rating.driver_id) || [];
    rows.push(rating);
    grouped.set(rating.driver_id, rows);
  });

  const summaries: Record<string, DriverRatingSummary> = {};
  grouped.forEach((rows, driverId) => {
    summaries[driverId] = buildRatingSummary(driverId, rows);
  });

  return summaries;
}

export function subscribeToRatings(onChange: () => void): () => void {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`ratings-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ratings",
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

function buildRatingSummary(driverId: string, rows: RatingRow[]): DriverRatingSummary {
  const totalRatings = rows.length;
  const averageRating = totalRatings
    ? Number((rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / totalRatings).toFixed(2))
    : 0;

  return {
    driverId,
    averageRating,
    totalRatings,
    recentFeedback: rows
      .filter((row) => row.feedback?.trim())
      .slice(0, 3)
      .map((row) => ({
        id: row.id,
        rating: Number(row.rating),
        feedback: row.feedback?.trim() || "",
        createdAt: row.created_at,
      })),
  };
}

function normalizeRecentFeedback(value: unknown): DriverFeedback[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((item: any) => ({
    id: String(item.id || crypto.randomUUID()),
    rating: Number(item.rating || 0),
    feedback: String(item.feedback || ""),
    createdAt: String(item.created_at || new Date().toISOString()),
  })).filter((item) => item.feedback);
}

function getEmptyRatingSummary(): DriverRatingSummary {
  return {
    driverId: null,
    averageRating: 0,
    totalRatings: 0,
    recentFeedback: [],
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
