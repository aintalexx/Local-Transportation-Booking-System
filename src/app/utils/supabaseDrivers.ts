import { supabase } from "../lib/supabase";
import type { UserData } from "./userDatabase";

export type SupabaseDriverRow = {
  id: string;
  phone: string;
  first_name: string;
  middle_name: string | null;
  surname: string;
  suffix: string | null;
  birthdate: string;
  password: string;
  profile_photo: string | null;
  valid_id_photo: string | null;
  or_cr_photo: string | null;
  clearance_photo: string | null;
  vehicle_photo: string | null;
  license_number: string | null;
  plate_number: string | null;
  vehicle_type: string;
  approval_status: "pending" | "approved" | "rejected";
  account_status: "Active" | "Blocked" | "Archived" | "Suspended";
  created_at: string;
  updated_at: string;
};

/**
 * Register a driver in the Supabase `drivers` table.
 */
export async function registerSupabaseDriver(user: UserData): Promise<SupabaseDriverRow | null> {
  if (!supabase) return null;

  const payload = {
    phone: user.phoneNumber,
    first_name: user.firstName,
    middle_name: user.middleName || null,
    surname: user.surname,
    suffix: user.suffix || null,
    birthdate: user.birthdate,
    password: user.password,
    profile_photo: user.profilePhoto || null,
    valid_id_photo: user.validIdPhoto || null,
    or_cr_photo: user.orCrPhoto || null,
    clearance_photo: user.clearancePhoto || null,
    vehicle_photo: user.vehiclePhoto || null,
    license_number: user.licenseNumber || null,
    plate_number: user.plateNumber || null,
    vehicle_type: user.vehicleType || "Tricycle",
    approval_status: user.approvalStatus || "pending",
    account_status: "Active",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("drivers")
    .upsert(payload, { onConflict: "phone" })
    .select()
    .single();

  if (error) {
    console.error("Error inserting driver to Supabase drivers table:", error.message);
    return null;
  }

  return data as SupabaseDriverRow;
}

/**
 * Fetch a driver from Supabase `drivers` table by phone number.
 */
export async function getSupabaseDriverByPhone(phone: string): Promise<SupabaseDriverRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("Error fetching driver by phone from Supabase:", error.message);
    return null;
  }

  return data as SupabaseDriverRow;
}

/**
 * Fetch a driver from Supabase `drivers` table by ID.
 */
export async function getSupabaseDriverById(id: string): Promise<SupabaseDriverRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching driver by ID from Supabase:", error.message);
    return null;
  }

  return data as SupabaseDriverRow;
}

/**
 * Update driver status (approval_status or account_status) in Supabase.
 */
export async function updateSupabaseDriverStatus(
  id: string,
  approvalStatus: "pending" | "approved" | "rejected",
  accountStatus?: "Active" | "Blocked" | "Archived" | "Suspended"
): Promise<boolean> {
  if (!supabase) return false;

  const payload: Partial<SupabaseDriverRow> = {
    approval_status: approvalStatus,
    updated_at: new Date().toISOString(),
  };

  if (accountStatus) {
    payload.account_status = accountStatus;
  }

  const { error } = await supabase
    .from("drivers")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Error updating driver status in Supabase:", error.message);
    return false;
  }

  return true;
}

/**
 * Fetch all drivers from the Supabase `drivers` table.
 */
export async function getAllSupabaseDrivers(): Promise<SupabaseDriverRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all drivers from Supabase:", error.message);
    return [];
  }

  return data as SupabaseDriverRow[];
}
