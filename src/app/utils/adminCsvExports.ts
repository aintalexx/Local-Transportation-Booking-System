import { supabase } from "../lib/supabase";
import type { Booking, Driver } from "../adminPanel/context/AppStateContext";
import { createCsvFilename, downloadCsv, type CsvRow } from "./csvExport";

type ExportResult = {
  success: boolean;
  count: number;
  error?: string;
};

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function matchesSearch(row: Record<string, unknown>, search: string): boolean {
  const q = normalize(search);
  if (!q) return true;

  return Object.values(row).some((value) => normalize(value).includes(q));
}

export function exportDriversCsv(drivers: Driver[]): ExportResult {
  const rows: CsvRow[] = drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicle: driver.vehicle,
    plate_number: driver.plate,
    route: driver.route,
    status: driver.status,
    license_status: driver.license,
    license_number: driver.licenseNumber,
    total_rides: driver.rides,
    rating: driver.rating,
    rating_count: driver.ratingCount || 0,
    joined: driver.joined,
  }));

  const success = downloadCsv(createCsvFilename("drivers-export"), rows);
  return success ? { success, count: rows.length } : { success, count: 0, error: "No driver records match the active filters." };
}

export function exportBookingsCsv(bookings: Booking[]): ExportResult {
  const rows: CsvRow[] = bookings.map((booking) => ({
    id: booking.id,
    passenger: booking.passenger,
    passenger_phone: booking.passengerPhone,
    driver: booking.driver,
    driver_phone: booking.driverPhone,
    vehicle: booking.vehicle,
    pickup: booking.from,
    destination: booking.to,
    fare: booking.fare,
    distance: booking.distance,
    duration: booking.duration,
    status: booking.status,
    seats: booking.seats,
    booking_type: booking.bookingType || "",
    passenger_count: booking.passengerCount,
    total_fare: booking.totalFare,
    individual_share: booking.individualShare,
    split_payment_enabled: booking.splitPaymentEnabled,
    driver_earnings: booking.driverEarnings,
    booked_at: booking.booked,
    ended_at: booking.ended,
  }));

  const success = downloadCsv(createCsvFilename("bookings-export"), rows);
  return success ? { success, count: rows.length } : { success, count: 0, error: "No booking records match the active filters." };
}

export async function exportPassengersCsv(search: string): Promise<ExportResult> {
  if (!supabase) return { success: false, count: 0, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, first_name, middle_name, surname, suffix, email, phone, account_status, registration_date, created_at, updated_at")
    .eq("role", "passenger")
    .order("created_at", { ascending: false });

  if (error) return { success: false, count: 0, error: error.message };

  const rows = ((data || []) as Record<string, unknown>[])
    .filter((row) => matchesSearch(row, search))
    .map((passenger) => ({
      id: passenger.id as string,
      username: passenger.username as string,
      full_name: passenger.full_name as string,
      first_name: passenger.first_name as string,
      middle_name: passenger.middle_name as string,
      surname: passenger.surname as string,
      suffix: passenger.suffix as string,
      email: passenger.email as string,
      phone: passenger.phone as string,
      account_status: passenger.account_status as string,
      registration_date: passenger.registration_date as string,
      created_at: passenger.created_at as string,
      updated_at: passenger.updated_at as string,
    }));

  const success = downloadCsv(createCsvFilename("passengers-export"), rows);
  return success ? { success, count: rows.length } : { success, count: 0, error: "No passenger records match the active search." };
}

export async function exportRatingsCsv(search: string): Promise<ExportResult> {
  if (!supabase) return { success: false, count: 0, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("ratings")
    .select("id, booking_id, passenger_id, driver_id, rating, feedback, created_at")
    .order("created_at", { ascending: false });

  if (error) return { success: false, count: 0, error: error.message };

  const rows = ((data || []) as Record<string, unknown>[])
    .filter((row) => matchesSearch(row, search))
    .map((rating) => ({
      id: rating.id as string,
      booking_id: rating.booking_id as string,
      passenger_id: rating.passenger_id as string,
      driver_id: rating.driver_id as string,
      rating: Number(rating.rating || 0),
      feedback: rating.feedback as string,
      created_at: rating.created_at as string,
    }));

  const success = downloadCsv(createCsvFilename("ratings-export"), rows);
  return success ? { success, count: rows.length } : { success, count: 0, error: "No rating records match the active search." };
}
