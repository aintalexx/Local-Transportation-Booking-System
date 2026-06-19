import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseConfigMessage, supabase } from "../lib/supabase";
import { getAllUsers, updateUser, type UserData } from "./userDatabase";
import { syncSupabaseProfile } from "./supabaseProfiles";
import { formatPersonName, normalizeDisplayName, normalizeOptionalSuffix } from "./nameFormatting";
import { formatPHPhoneInput } from "./validators";

const GOOGLE_ROLE_KEY = "arangkada_google_signup_role";

type AppRole = UserData["role"];
type PublicSignupRole = Extract<AppRole, "passenger" | "driver">;

export async function signInWithGoogle(role: PublicSignupRole = "passenger") {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  sessionStorage.setItem(GOOGLE_ROLE_KEY, role);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function getPendingGoogleRole(): PublicSignupRole {
  const pendingRole = sessionStorage.getItem(GOOGLE_ROLE_KEY);
  return pendingRole === "driver" ? "driver" : "passenger";
}

export function hasPendingGoogleRole(): boolean {
  return sessionStorage.getItem(GOOGLE_ROLE_KEY) === "passenger" ||
    sessionStorage.getItem(GOOGLE_ROLE_KEY) === "driver";
}

export function clearPendingGoogleRole() {
  sessionStorage.removeItem(GOOGLE_ROLE_KEY);
}

export async function resolveAuthEmailForLogin(identifier: string): Promise<string | null> {
  const normalizedIdentifier = identifier.trim();
  const normalizedLower = normalizedIdentifier.toLowerCase();

  if (!normalizedIdentifier) return null;
  if (normalizedIdentifier.includes("@")) return normalizedLower;

  const normalizedPhone = formatPHPhoneInput(normalizedIdentifier);

  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .or(`username.eq.${normalizedLower},phone.eq.${normalizedLower},phone.eq.${normalizedPhone}`)
    .maybeSingle();

  if (error) {
    console.info("Username/phone email lookup failed in Supabase:", error.message);
    return null;
  }

  const profileEmail = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
  return profileEmail || null;
}

export async function createLocalUserFromGoogle(supabaseUser: SupabaseUser, role: PublicSignupRole): Promise<UserData> {
  const email = supabaseUser.email?.trim().toLowerCase() || "";
  const metadata = supabaseUser.user_metadata || {};

  const { data: profile } = supabase
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle()
    : { data: null };

  const fullName = normalizeDisplayName(profile?.full_name || metadata.full_name || metadata.name || email.split("@")[0] || "Google User");
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = metadata.first_name || normalizeDisplayName(metadata.given_name) || nameParts[0] || "Google";
  const surname = metadata.surname || normalizeDisplayName(metadata.family_name) || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "User");
  const middleName = metadata.middle_name || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "");
  const existingUser = getAllUsers().find(user =>
    user.supabaseId === supabaseUser.id ||
    (email && user.email?.trim().toLowerCase() === email)
  );
  const username = profile?.username || existingUser?.username || metadata.username || `google_${supabaseUser.id.replace(/-/g, "").slice(0, 16)}`;

  const userData: UserData = {
    supabaseId: supabaseUser.id,
    displayName: fullName,
    username,
    password: existingUser?.password || "",
    phoneNumber: profile?.phone || existingUser?.phoneNumber || metadata.phone || "",
    surname: existingUser?.surname || surname,
    firstName: existingUser?.firstName || firstName,
    middleName: existingUser?.middleName || middleName,
    suffix: normalizeOptionalSuffix(existingUser?.suffix || metadata.suffix),
    email,
    emailConfirmed: true,
    birthdate: existingUser?.birthdate || metadata.birthdate || "",
    role: profile?.role || existingUser?.role || role,
    guardianName: existingUser?.guardianName || metadata.guardian_name || "",
    guardianPhone: existingUser?.guardianPhone || metadata.guardian_phone || "",
    rating: existingUser?.rating || 5,
    totalTrips: existingUser?.totalTrips || 0,
    totalEarnings: existingUser?.totalEarnings || 0,
    vehicleType: profile?.vehicle_type || existingUser?.vehicleType || "",
    plateNumber: profile?.plate_number || existingUser?.plateNumber || "",
    driverLicensePhoto: profile?.driver_license_photo || existingUser?.driverLicensePhoto || "",
    licenseNumber: profile?.license_number || existingUser?.licenseNumber || "",
    validIdPhoto: profile?.valid_id_photo || existingUser?.validIdPhoto || "",
    orCrPhoto: profile?.or_cr_photo || existingUser?.orCrPhoto || "",
    clearancePhoto: profile?.clearance_photo || existingUser?.clearancePhoto || "",
    vehiclePhoto: profile?.vehicle_photo || existingUser?.vehiclePhoto || "",
    vehicleColor: existingUser?.vehicleColor || "",
    memberSince: existingUser?.memberSince || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: profile?.approval_status || existingUser?.approvalStatus || (role === "driver" ? "pending" : "approved"),
    profilePhoto: profile?.profile_photo || existingUser?.profilePhoto || String(metadata.avatar_url || metadata.picture || ""),
  };

  updateUser(username, userData);
  return userData;
}

export async function signUpWithEmailPassword(userData: UserData): Promise<UserData | null> {
  if (!supabase || !userData.email || !userData.password) return null;

  const fullName = formatPersonName(userData, userData.username);

  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        username: userData.username,
        full_name: fullName,
        first_name: userData.firstName,
        middle_name: userData.middleName || "",
        surname: userData.surname,
        suffix: userData.suffix || "",
        birthdate: userData.birthdate || "",
        phone: userData.phoneNumber,
        role: userData.role,
        vehicle_type: userData.vehicleType || "",
        plate_number: userData.plateNumber || "",
        license_number: userData.licenseNumber || "",
        driver_license_photo: userData.driverLicensePhoto || "",
        valid_id_photo: userData.validIdPhoto || "",
        or_cr_photo: userData.orCrPhoto || "",
        clearance_photo: userData.clearancePhoto || "",
        vehicle_photo: userData.vehiclePhoto || "",
        profile_photo: userData.profilePhoto || "",
        approval_status: userData.approvalStatus || (userData.role === "driver" ? "pending" : "approved"),
        registration_date: userData.registrationDate || new Date().toISOString(),
        account_status: userData.accountStatus || "Active",
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) return null;

  const nextUser = {
    ...userData,
    supabaseId: data.user.id,
    emailConfirmed: Boolean(data.user.email_confirmed_at || data.session),
  };

  updateUser(nextUser.username, nextUser);
  await syncSupabaseProfile(nextUser);
  return nextUser;
}

export async function signInWithEmailPassword(
  identifier: string,
  password: string,
  fallbackRole: AppRole = "passenger"
): Promise<UserData | null> {
  if (!supabase || !identifier.includes("@")) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) return null;
  return createLocalUserFromSupabaseUser(data.user, fallbackRole, password);
}

export async function requestSupabasePasswordReset(email: string): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function prepareSupabasePasswordRecovery(url: string): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  const recoveryUrl = new URL(url);
  const code = recoveryUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    return;
  }

  const hash = new URLSearchParams(recoveryUrl.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw new Error(error.message);
  }
}

export async function updateSupabasePassword(nextPassword: string): Promise<void> {
  if (!supabase) {
    throw new Error(getSupabaseConfigMessage());
  }

  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) {
    throw new Error(error.message);
  }
}

export async function createLocalUserFromSupabaseUser(
  supabaseUser: SupabaseUser,
  fallbackRole: AppRole = "passenger",
  password?: string
): Promise<UserData> {
  const email = supabaseUser.email?.trim().toLowerCase() || "";
  const metadata = supabaseUser.user_metadata || {};

  const { data: profile } = supabase
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle()
    : { data: null };

  const fullName = normalizeDisplayName(profile?.full_name || metadata.full_name || metadata.name || email.split("@")[0] || "Supabase User");
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = profile?.first_name || metadata.first_name || nameParts[0] || "User";
  const surname = profile?.surname || metadata.surname || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
  const middleName = profile?.middle_name || metadata.middle_name || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "");
  const birthdate = profile?.birthdate || metadata.birthdate || "";
  const phoneNumber = profile?.phone || metadata.phone || metadata.phone_number || "";
  const isAdminEmail = email === "admin@arangkada.ph";
  const role = isAdminEmail
    ? "admin"
    : (profile?.role === "driver" || metadata.role === "driver")
      ? "driver"
      : (profile?.role || metadata.role || fallbackRole) as AppRole;

  const userData: UserData = {
    supabaseId: supabaseUser.id,
    displayName: normalizeDisplayName(metadata.full_name || metadata.name || profile?.full_name || fullName),
    username: profile?.username || metadata.username || `user_${supabaseUser.id.replace(/-/g, "").slice(0, 16)}`,
    password: password || "",
    phoneNumber,
    surname,
    firstName,
    middleName,
    suffix: normalizeOptionalSuffix(profile?.suffix || metadata.suffix),
    email: profile?.email || email,
    emailConfirmed: Boolean(supabaseUser.email_confirmed_at || supabaseUser.confirmed_at),
    birthdate,
    role,
    guardianName: profile?.guardian_name || metadata.guardian_name || "",
    guardianPhone: profile?.guardian_phone || metadata.guardian_phone || "",
    rating: 5,
    totalTrips: 0,
    totalEarnings: 0,
    vehicleType: profile?.vehicle_type || metadata.vehicle_type || "",
    plateNumber: profile?.plate_number || metadata.plate_number || "",
    driverLicensePhoto: profile?.driver_license_photo || "",
    licenseNumber: profile?.license_number || "",
    validIdPhoto: profile?.valid_id_photo || "",
    orCrPhoto: profile?.or_cr_photo || "",
    clearancePhoto: profile?.clearance_photo || "",
    vehiclePhoto: profile?.vehicle_photo || "",
    vehicleColor: profile?.vehicle_color || "",
    memberSince: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: profile?.approval_status || (role === "driver" ? "pending" : "approved"),
    profilePhoto: profile?.profile_photo || String(metadata.avatar_url || metadata.picture || ""),
  };

  if (profile?.role !== userData.role || profile?.approval_status !== userData.approvalStatus) {
    await syncSupabaseProfile(userData);
  }

  updateUser(userData.username, userData);
  return userData;
}
