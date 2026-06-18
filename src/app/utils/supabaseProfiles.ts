import { supabase } from "../lib/supabase";
import { formatPersonName } from "./nameFormatting";
import type { UserData } from "./userDatabase";

export type SupabaseProfile = {
  id: string;
  username: string | null;
  email?: string | null;
  full_name: string;
  first_name?: string | null;
  middle_name?: string | null;
  surname?: string | null;
  suffix?: string | null;
  birthdate?: string | null;
  phone: string | null;
  role: "passenger" | "driver" | "admin";
  vehicle_type: string | null;
  plate_number: string | null;
  license_number?: string | null;
  driver_license_photo?: string | null;
  valid_id_photo?: string | null;
  or_cr_photo?: string | null;
  clearance_photo?: string | null;
  vehicle_photo?: string | null;
  profile_photo?: string | null;
  is_online: boolean;
  approval_status?: "pending" | "approved" | "rejected";
  registration_date?: string | null;
  account_status?: "Active" | "Blocked" | "Archived" | "Suspended" | null;
};

export async function getCurrentSupabaseUserId(): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function profileContactExists(email: string, phone: string): Promise<{
  emailExists: boolean;
  phoneExists: boolean;
}> {
  if (!supabase) return { emailExists: false, phoneExists: false };

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [emailResult, phoneResult] = await Promise.all([
      normalizedEmail
        ? supabase.from("profiles").select("id").eq("email", normalizedEmail).limit(1)
        : Promise.resolve({ data: [], error: null }),
      phone
        ? supabase.from("profiles").select("id").eq("phone", phone).limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    return {
      emailExists: !emailResult.error && Boolean(emailResult.data?.length),
      phoneExists: !phoneResult.error && Boolean(phoneResult.data?.length),
    };
  } catch {
    return { emailExists: false, phoneExists: false };
  }
}

export async function syncSupabaseProfile(user: UserData): Promise<SupabaseProfile | null> {
  if (!supabase) return null;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return null;

  const fullName = formatPersonName(user, user.username);
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("approval_status")
    .eq("id", userId)
    .maybeSingle();

  const approvalStatus =
    existingProfile?.approval_status ||
    user.approvalStatus ||
    (user.role === "driver" ? "pending" : "approved");

  const baseProfilePayload = {
    id: userId,
    username: user.username,
    email: user.email?.trim().toLowerCase() || null,
    full_name: fullName,
    phone: user.phoneNumber || null,
    role: user.role,
    vehicle_type: user.vehicleType || null,
    plate_number: user.plateNumber || null,
    license_number: user.licenseNumber || null,
    driver_license_photo: user.driverLicensePhoto || null,
    valid_id_photo: user.validIdPhoto || null,
    or_cr_photo: user.orCrPhoto || null,
    clearance_photo: user.clearancePhoto || null,
    vehicle_photo: user.vehiclePhoto || null,
    profile_photo: user.profilePhoto || null,
    approval_status: approvalStatus,
    updated_at: new Date().toISOString(),
  };
  const optionalPassengerPayload = {
    first_name: user.firstName || null,
    middle_name: user.middleName || null,
    surname: user.surname || null,
    suffix: user.suffix || null,
    birthdate: user.birthdate || null,
    registration_date: user.registrationDate || new Date().toISOString(),
    account_status: user.accountStatus || "Active",
  };
  const profilePayload = {
    ...baseProfilePayload,
    ...optionalPassengerPayload,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      profilePayload,
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error && (
    error.message.toLowerCase().includes("email") ||
    error.message.toLowerCase().includes("column") ||
    error.message.toLowerCase().includes("schema cache")
  )) {
    const retryPayload = error.message.toLowerCase().includes("email")
      ? (({ email: _email, ...payload }) => payload)(baseProfilePayload)
      : baseProfilePayload;
    const { data: retryData, error: retryError } = await supabase
      .from("profiles")
      .upsert(retryPayload, { onConflict: "id" })
      .select()
      .single();

    if (!retryError) {
      return retryData as SupabaseProfile;
    }
  }

  if (error) {
    console.info("Supabase profile sync failed. Local account flow will continue:", error.message);
    return null;
  }

  return data as SupabaseProfile;
}

export async function setDriverOnlineStatus(user: UserData, isOnline: boolean): Promise<void> {
  if (!supabase) return;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return;

  await supabase
    .from("profiles")
    .update({
      is_online: isOnline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
