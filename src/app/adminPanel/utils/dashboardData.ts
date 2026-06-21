import { supabase } from "../../lib/supabase";

export type DashboardCounts = {
  totalPassengers: number;
  totalDrivers: number;
  pendingDriverApprovals: number;
  approvedDrivers: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  totalRatings: number;
};

export type DashboardBookingRow = {
  id: string;
  passenger_name?: string | null;
  driver_name?: string | null;
  pickup_address?: string | null;
  destination_address?: string | null;
  status?: string | null;
  created_at?: string | null;
  final_price?: number | string | null;
};

export type DashboardDriverRow = {
  id: string;
  first_name?: string | null;
  surname?: string | null;
  approval_status?: string | null;
  account_status?: string | null;
  created_at?: string | null;
};

export type DashboardPassengerRow = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  created_at?: string | null;
};

export type DashboardRatingRow = {
  id: string;
  driver_id?: string | null;
  rating?: number | string | null;
  created_at?: string | null;
};

export type DashboardSnapshot = {
  counts: DashboardCounts;
  bookings: DashboardBookingRow[];
  drivers: DashboardDriverRow[];
  passengers: DashboardPassengerRow[];
  ratings: DashboardRatingRow[];
};

const EMPTY_COUNTS: DashboardCounts = {
  totalPassengers: 0,
  totalDrivers: 0,
  pendingDriverApprovals: 0,
  approvedDrivers: 0,
  activeBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  averageRating: 0,
  totalRatings: 0,
};

function sumAverage(values: Array<number | string | null | undefined>): number {
  const numbers = values.map((value) => Number(value || 0)).filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return 0;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!supabase) {
    return { counts: EMPTY_COUNTS, bookings: [], drivers: [], passengers: [], ratings: [] };
  }

  const [passengersResult, driversResult, bookingsResult, ratingsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, username, created_at", { count: "exact" }).eq("role", "passenger").eq("is_deleted", false),
    supabase.from("drivers").select("id, first_name, surname, approval_status, account_status, created_at", { count: "exact" }).eq("is_deleted", false),
    supabase.from("bookings").select("id, passenger_name, driver_name, pickup_address, destination_address, status, created_at, final_price", { count: "exact" }).eq("is_deleted", false),
    supabase.from("ratings").select("id, driver_id, rating, created_at", { count: "exact" }).eq("is_deleted", false),
  ]);

  const passengers = (passengersResult.data || []) as DashboardPassengerRow[];
  const drivers = (driversResult.data || []) as DashboardDriverRow[];
  const bookings = (bookingsResult.data || []) as DashboardBookingRow[];
  const ratings = (ratingsResult.data || []) as DashboardRatingRow[];

  const counts: DashboardCounts = {
    totalPassengers: passengersResult.count || 0,
    totalDrivers: driversResult.count || 0,
    pendingDriverApprovals: drivers.filter((driver) => String(driver.approval_status || "").toLowerCase() === "pending").length,
    approvedDrivers: drivers.filter((driver) => String(driver.approval_status || "").toLowerCase() === "approved").length,
    activeBookings: bookings.filter((booking) => ["pending", "searching", "available", "accepted", "driver_arriving", "en_route", "passenger_picked_up", "arrived", "in_progress"].includes(String(booking.status || "").toLowerCase())).length,
    completedBookings: bookings.filter((booking) => String(booking.status || "").toLowerCase() === "completed").length,
    cancelledBookings: bookings.filter((booking) => String(booking.status || "").toLowerCase() === "cancelled").length,
    averageRating: sumAverage(ratings.map((rating) => rating.rating)),
    totalRatings: ratingsResult.count || ratings.length,
  };

  return { counts, bookings, drivers, passengers, ratings };
}

export function subscribeToDashboardChanges(onChange: () => void): () => void {
  if (!supabase) return () => {};

  const channels = [
    supabase.channel(`admin-dashboard-profiles-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, onChange).subscribe(),
    supabase.channel(`admin-dashboard-drivers-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, onChange).subscribe(),
    supabase.channel(`admin-dashboard-bookings-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, onChange).subscribe(),
    supabase.channel(`admin-dashboard-ratings-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "ratings" }, onChange).subscribe(),
  ];

  return () => {
    channels.forEach((channel) => supabase.removeChannel(channel));
  };
}
