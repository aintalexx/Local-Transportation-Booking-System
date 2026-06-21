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
  vehicle_color?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
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

export type EditableProfileData = {
  username?: string;
  firstName: string;
  middleName?: string;
  surname: string;
  suffix?: string;
  phoneNumber: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  plateNumber?: string;
  vehicleColor?: string;
  profilePhoto?: string;
};

export type DriverEditableProfileData = Pick<
  EditableProfileData,
  "username" | "firstName" | "middleName" | "surname" | "suffix" | "profilePhoto"
>;

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

export async function getSupabaseProfileByPhone(
  phone: string,
  role?: "passenger" | "driver" | "admin"
): Promise<SupabaseProfile | null> {
  if (!supabase || !phone) return null;

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("phone", phone);

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    console.info("Profile phone lookup failed:", error.message);
    return null;
  }

  return data as SupabaseProfile | null;
}

export async function profileContactExistsForOther(
  email: string,
  phone: string,
  currentUserId: string
): Promise<{
  emailExists: boolean;
  phoneExists: boolean;
  error: string | null;
}> {
  if (!supabase) return { emailExists: false, phoneExists: false, error: null };

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [emailResult, phoneResult] = await Promise.all([
      normalizedEmail
        ? supabase
            .from("profiles")
            .select("id")
            .eq("email", normalizedEmail)
            .neq("id", currentUserId)
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
      phone
        ? supabase
            .from("profiles")
            .select("id")
            .eq("phone", phone)
            .neq("id", currentUserId)
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const error = emailResult.error?.message || phoneResult.error?.message || null;
    return {
      emailExists: !emailResult.error && Boolean(emailResult.data?.length),
      phoneExists: !phoneResult.error && Boolean(phoneResult.data?.length),
      error,
    };
  } catch (error) {
    return {
      emailExists: false,
      phoneExists: false,
      error: error instanceof Error ? error.message : "Failed to check profile contacts.",
    };
  }
}

export async function profileUsernameExistsForOther(
  username: string,
  currentUserId: string
): Promise<{ exists: boolean; error: string | null }> {
  if (!supabase) return { exists: false, error: null };

  const normalizedUsername = username.trim();
  if (!normalizedUsername) return { exists: false, error: null };

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .neq("id", currentUserId)
      .limit(1);

    return {
      exists: !error && Boolean(data?.length),
      error: error?.message || null,
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Failed to check username.",
    };
  }
}

export async function getOwnSupabaseProfile(user: UserData): Promise<SupabaseProfile | null> {
  if (!supabase) return null;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  const authUserId = await getCurrentSupabaseUserId();
  if (!userId || !authUserId || userId !== authUserId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupabaseProfile;
}

export async function updateOwnSupabaseProfile(
  user: UserData,
  updates: EditableProfileData
): Promise<{ profile: SupabaseProfile | null; error: string | null }> {
  if (!supabase) {
    return { profile: null, error: "Supabase is not configured." };
  }

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  const authUserId = await getCurrentSupabaseUserId();
  if (!userId || !authUserId || userId !== authUserId) {
    return { profile: null, error: "You can only update your own profile." };
  }

  const fullName = formatPersonName(
    {
      ...user,
      firstName: updates.firstName,
      middleName: updates.middleName || "",
      surname: updates.surname,
      suffix: updates.suffix || "",
    },
    user.username
  );

  const payload = {
    username: updates.username?.trim() || user.username,
    first_name: updates.firstName,
    middle_name: updates.middleName || null,
    surname: updates.surname,
    suffix: updates.suffix || null,
    full_name: fullName,
    phone: updates.phoneNumber,
    email: updates.email?.trim().toLowerCase() || null,
    guardian_name: updates.guardianName || null,
    guardian_phone: updates.guardianPhone || null,
    plate_number: updates.plateNumber || user.plateNumber || null,
    vehicle_color: updates.vehicleColor || null,
    profile_photo: updates.profilePhoto || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", authUserId)
    .select("*")
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as SupabaseProfile, error: null };
}

export async function updateApprovedDriverEditableProfile(
  user: UserData,
  updates: DriverEditableProfileData
): Promise<{ profile: SupabaseProfile | null; error: string | null }> {
  if (!supabase) {
    return { profile: null, error: "Supabase is not configured." };
  }

  if (user.role !== "driver") {
    return { profile: null, error: "Only driver accounts can use this update path." };
  }

  if (!user.phoneNumber || !user.password) {
    return { profile: null, error: "Unable to verify driver profile. Please log in again." };
  }

  const { data, error } = await supabase.rpc("update_driver_editable_profile", {
    p_driver_phone: user.phoneNumber,
    p_driver_password: user.password,
    p_username: updates.username?.trim() || user.username,
    p_first_name: updates.firstName,
    p_middle_name: updates.middleName || null,
    p_surname: updates.surname,
    p_suffix: updates.suffix || null,
    p_profile_photo: updates.profilePhoto || null,
  });

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as SupabaseProfile, error: null };
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
    user.approvalStatus === "approved"
      ? "approved"
      : existingProfile?.approval_status ||
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
    vehicle_color: user.vehicleColor || null,
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
    guardian_name: user.guardianName || null,
    guardian_phone: user.guardianPhone || null,
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
