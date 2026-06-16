import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseConfigMessage, supabase } from "../lib/supabase";
import { getAllUsers, updateUser, type UserData } from "./userDatabase";
import { syncSupabaseProfile } from "./supabaseProfiles";
import { formatPersonName, normalizeDisplayName, normalizeOptionalSuffix } from "./nameFormatting";

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

export function clearPendingGoogleRole() {
  sessionStorage.removeItem(GOOGLE_ROLE_KEY);
}

export function createLocalUserFromGoogle(supabaseUser: SupabaseUser, role: PublicSignupRole): UserData {
  const email = supabaseUser.email?.trim().toLowerCase() || "";
  const metadata = supabaseUser.user_metadata || {};
  const fullName = normalizeDisplayName(metadata.full_name || metadata.name || email.split("@")[0] || "Google User");
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = normalizeDisplayName(metadata.given_name) || nameParts[0] || "Google";
  const surname = normalizeDisplayName(metadata.family_name) || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "User");
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";
  const existingUser = getAllUsers().find(user => user.email?.trim().toLowerCase() === email);
  const username = existingUser?.username || `google_${supabaseUser.id.replace(/-/g, "").slice(0, 16)}`;

  const userData: UserData = {
    supabaseId: supabaseUser.id,
    displayName: fullName,
    username,
    password: existingUser?.password || "",
    phoneNumber: existingUser?.phoneNumber || "",
    surname: existingUser?.surname || surname,
    firstName: existingUser?.firstName || firstName,
    middleName: existingUser?.middleName || middleName,
    suffix: normalizeOptionalSuffix(existingUser?.suffix),
    email,
    birthdate: existingUser?.birthdate || "",
    role: existingUser?.role || role,
    guardianName: existingUser?.guardianName || "",
    guardianPhone: existingUser?.guardianPhone || "",
    rating: existingUser?.rating || 5,
    totalTrips: existingUser?.totalTrips || 0,
    totalEarnings: existingUser?.totalEarnings || 0,
    vehicleType: existingUser?.vehicleType || "",
    plateNumber: existingUser?.plateNumber || "",
    driverLicensePhoto: existingUser?.driverLicensePhoto || "",
    vehicleColor: existingUser?.vehicleColor || "",
    memberSince: existingUser?.memberSince || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: existingUser?.approvalStatus || (role === "driver" ? "pending" : "approved"),
    profilePhoto: existingUser?.profilePhoto || String(metadata.avatar_url || metadata.picture || ""),
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
      data: {
        username: userData.username,
        full_name: fullName,
        phone: userData.phoneNumber,
        role: userData.role,
        vehicle_type: userData.vehicleType || "",
        plate_number: userData.plateNumber || "",
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
  };

  updateUser(nextUser.username, nextUser);
  await syncSupabaseProfile(nextUser);
  return nextUser;
}

export async function signInWithEmailPassword(identifier: string, password: string): Promise<UserData | null> {
  if (!supabase || !identifier.includes("@")) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) return null;
  return createLocalUserFromSupabaseUser(data.user);
}

export async function createLocalUserFromSupabaseUser(supabaseUser: SupabaseUser, fallbackRole: AppRole = "passenger"): Promise<UserData> {
  const email = supabaseUser.email?.trim().toLowerCase() || "";
  const metadata = supabaseUser.user_metadata || {};
  const existingUser = getAllUsers().find(user =>
    user.supabaseId === supabaseUser.id ||
    (email && user.email?.trim().toLowerCase() === email)
  );

  const { data: profile } = supabase
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle()
    : { data: null };

  const fullName = normalizeDisplayName(profile?.full_name || metadata.full_name || metadata.name || email.split("@")[0] || "Supabase User");
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = existingUser?.firstName || nameParts[0] || "User";
  const surname = existingUser?.surname || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
  const middleName = existingUser?.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "");
  const role = (profile?.role || existingUser?.role || metadata.role || fallbackRole) as AppRole;

  const userData: UserData = {
    supabaseId: supabaseUser.id,
    displayName: normalizeDisplayName(existingUser?.displayName || metadata.full_name || metadata.name || profile?.full_name || fullName),
    username: profile?.username || existingUser?.username || metadata.username || `user_${supabaseUser.id.replace(/-/g, "").slice(0, 16)}`,
    password: existingUser?.password || "",
    phoneNumber: profile?.phone || existingUser?.phoneNumber || metadata.phone || "",
    surname,
    firstName,
    middleName,
    suffix: normalizeOptionalSuffix(existingUser?.suffix),
    email,
    birthdate: existingUser?.birthdate || "",
    role,
    guardianName: existingUser?.guardianName || "",
    guardianPhone: existingUser?.guardianPhone || "",
    rating: existingUser?.rating || 5,
    totalTrips: existingUser?.totalTrips || 0,
    totalEarnings: existingUser?.totalEarnings || 0,
    vehicleType: profile?.vehicle_type || existingUser?.vehicleType || metadata.vehicle_type || "",
    plateNumber: profile?.plate_number || existingUser?.plateNumber || metadata.plate_number || "",
    driverLicensePhoto: existingUser?.driverLicensePhoto || "",
    vehicleColor: existingUser?.vehicleColor || "",
    memberSince: existingUser?.memberSince || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    approvalStatus: profile?.approval_status || existingUser?.approvalStatus || (role === "driver" ? "pending" : "approved"),
    profilePhoto: existingUser?.profilePhoto || String(metadata.avatar_url || metadata.picture || ""),
  };

  updateUser(userData.username, userData);
  return userData;
}
