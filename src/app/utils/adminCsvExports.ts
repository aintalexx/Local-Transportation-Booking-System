import { supabase } from "../lib/supabase";
import { createCsvFilename, downloadCsv, formatExportTimestamp, type CsvRow } from "./csvExport";

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

function fullName(row: { full_name?: string | null; first_name?: string | null; middle_name?: string | null; surname?: string | null; username?: string | null; }): string {
  return [
    row.full_name,
    row.first_name,
    row.middle_name,
    row.surname,
  ].filter(Boolean).join(" ").trim() || row.username || "";
}

function safeDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hour24 = date.getHours();
  const hour12 = hour24 % 12 || 12;
  const minute = pad(date.getMinutes());
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour12)}:${minute} ${suffix}`;
}

function reportTitle(): string[] {
  const now = formatExportTimestamp();
  return [
    "Arangkada Transportation Booking System",
    `Export generated: ${now}`,
    "",
  ];
}

function downloadReport(prefix: string, rows: CsvRow[]): ExportResult {
  const success = downloadCsv(createCsvFilename(prefix), rows, reportTitle());
  return success ? { success, count: rows.length } : { success, count: 0, error: "No records found for export." };
}

export async function exportPassengersCsv(search: string): Promise<ExportResult> {
  if (!supabase) return { success: false, count: 0, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, first_name, middle_name, surname, suffix, email, phone, address, account_status, registration_date, created_at")
    .eq("role", "passenger")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return { success: false, count: 0, error: error.message };

  const rows = ((data || []) as Record<string, unknown>[])
    .filter((row) => matchesSearch(row, search))
    .map((passenger) => ({
      "Passenger ID": passenger.id || "",
      "Full Name": fullName(passenger),
      "Username": passenger.username || "",
      "Email": passenger.email || "",
      "Mobile Number": passenger.phone || "",
      "Address": passenger.address || "",
      "Account Status": passenger.account_status || "",
      "Date Registered": safeDate((passenger.registration_date as string) || (passenger.created_at as string)),
    }));

  return downloadReport("passengers_export", rows);
}

export async function exportDriversCsv(search: string): Promise<ExportResult> {
  if (!supabase) return { success: false, count: 0, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("drivers")
    .select("id, phone, first_name, middle_name, surname, suffix, vehicle_type, plate_number, approval_status, account_status, created_at, is_online")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return { success: false, count: 0, error: error.message };

  const rows = ((data || []) as Record<string, unknown>[])
    .filter((row) => matchesSearch(row, search))
    .map((driver) => ({
      "Driver ID": driver.id || "",
      "Full Name": fullName(driver),
      "Username": driver.phone || "",
      "Mobile Number": driver.phone || "",
      "Vehicle Type": driver.vehicle_type || "",
      "Plate Number": driver.plate_number || "",
      "Approval Status": driver.approval_status || "",
      "Online Status": Number(driver.is_online) ? "Online" : "Offline",
      "Date Registered": safeDate(driver.created_at as string),
    }));

  return downloadReport("drivers_export", rows);
}

export async function exportBookingsCsv(search: string): Promise<ExportResult> {
  if (!supabase) return { success: false, count: 0, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("bookings")
    .select("id, passenger_name, driver_name, pickup_address, destination_address, final_price, discount_type, status, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return { success: false, count: 0, error: error.message };

  const rows = ((data || []) as Record<string, unknown>[])
    .filter((row) => matchesSearch(row, search))
    .map((booking) => {
      const created = safeDate(booking.created_at as string);
      const [datePart, timePart] = created.split(" ");
      return {
        "Booking ID": booking.id || "",
        "Passenger Name": booking.passenger_name || "",
        "Driver Name": booking.driver_name || "",
        "Pickup Location": booking.pickup_address || "",
        "Drop-off Location": booking.destination_address || "",
        "Fare": Number(booking.final_price || 0),
        "Discount Type": booking.discount_type || "",
        "Booking Status": booking.status || "",
        "Booking Date": datePart || "",
        "Booking Time": `${timePart || ""} ${created.split(" ").slice(2).join(" ")}`.trim(),
      };
    });

  return downloadReport("bookings_export", rows);
}

export async function exportRatingsCsv(search: string): Promise<ExportResult> {
  if (!supabase) return { success: false, count: 0, error: "Supabase is not configured." };

  const [ratingsResult, passengersResult, driversResult] = await Promise.all([
    supabase.from("ratings").select("id, booking_id, passenger_id, driver_id, rating, feedback, created_at").eq("is_deleted", false).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, first_name, middle_name, surname, username").eq("is_deleted", false),
    supabase.from("drivers").select("id, first_name, middle_name, surname, username, phone").eq("is_deleted", false),
  ]);

  if (ratingsResult.error) return { success: false, count: 0, error: ratingsResult.error.message };

  const passengers = (passengersResult.data || []) as Record<string, unknown>[];
  const drivers = (driversResult.data || []) as Record<string, unknown>[];

  const rows = ((ratingsResult.data || []) as Record<string, unknown>[])
    .filter((row) => matchesSearch(row, search))
    .map((rating) => {
      const passenger = passengers.find((row) => row.id === rating.passenger_id);
      const driver = drivers.find((row) => row.id === rating.driver_id);
      return {
        "Rating ID": rating.id || "",
        "Passenger Name": passenger ? fullName(passenger) : "",
        "Driver Name": driver ? fullName(driver) : "",
        "Rating": Number(rating.rating || 0),
        "Feedback": rating.feedback || "",
        "Date Submitted": safeDate(rating.created_at as string),
      };
    });

  return downloadReport("ratings_export", rows);
}
