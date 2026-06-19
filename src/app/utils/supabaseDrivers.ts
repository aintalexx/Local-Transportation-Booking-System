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
    ...(user.supabaseId ? { id: user.supabaseId } : {}),
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

  const phoneDigits = normalizePhoneDigits(phone);
  const candidatePhones = buildPhoneCandidates(phone);

  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .in("phone", candidatePhones)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching driver by phone from Supabase:", error.message);
    return null;
  }

  if (data) return data as SupabaseDriverRow;

  if (!phoneDigits) return null;

  const { data: possibleRows, error: fallbackError } = await supabase
    .from("drivers")
    .select("*")
    .limit(100);

  if (fallbackError) {
    console.error("Error fetching driver phone fallback from Supabase:", fallbackError.message);
    return null;
  }

  const matchedDriver = (possibleRows as SupabaseDriverRow[] | null)?.find(
    (driver) => normalizePhoneDigits(driver.phone) === phoneDigits
  );

  if (matchedDriver) return matchedDriver;

  return data as SupabaseDriverRow;
}

function normalizePhoneDigits(value: string | null | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63")) return `0${digits.slice(2, 12)}`.slice(0, 11);
  if (digits.startsWith("9")) return `0${digits.slice(0, 10)}`.slice(0, 11);
  return digits.slice(0, 11);
}

function buildPhoneCandidates(value: string): string[] {
  const normalized = normalizePhoneDigits(value);
  const compact = String(value || "").replace(/\s+/g, "");
  const withoutZero = normalized.startsWith("0") ? normalized.slice(1) : normalized;
  return Array.from(new Set([
    value,
    compact,
    normalized,
    withoutZero ? `+63${withoutZero}` : "",
    withoutZero ? `63${withoutZero}` : "",
  ].filter(Boolean)));
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

/**
 * Upload a Base64-encoded image directly to a Supabase storage bucket,
 * ensuring the bucket exists first, and returning the public URL.
 */
export async function uploadBase64ToStorage(base64Data: string, filePath: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    // 1. Ensure the bucket exists
    try {
      await supabase.storage.createBucket("driver-documents", { public: true });
    } catch (bucketErr) {
      // Ignore bucket creation error if it already exists or fails to run (policies, etc.)
    }

    // 2. Convert base64 data URL to Blob
    const arr = base64Data.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });

    // 3. Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("driver-documents")
      .upload(filePath, blob, {
        contentType: mime,
        upsert: true,
      });

    if (error) {
      console.error("Error uploading file to storage:", error.message);
      return null;
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from("driver-documents")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Failed base64 upload helper:", err);
    return null;
  }
}
