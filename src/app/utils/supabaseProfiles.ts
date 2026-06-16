import { supabase } from "../lib/supabase";
import { formatPersonName } from "./nameFormatting";
import type { UserData } from "./userDatabase";

export type SupabaseProfile = {
  id: string;
  username: string | null;
  full_name: string;
  phone: string | null;
  role: "passenger" | "driver" | "admin";
  vehicle_type: string | null;
  plate_number: string | null;
  is_online: boolean;
  approval_status?: "pending" | "approved" | "rejected";
};

export async function getCurrentSupabaseUserId(): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function syncSupabaseProfile(user: UserData): Promise<SupabaseProfile | null> {
  if (!supabase) return null;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return null;

  const fullName = formatPersonName(user, user.username);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        username: user.username,
        full_name: fullName,
        phone: user.phoneNumber || null,
        role: user.role,
        vehicle_type: user.vehicleType || null,
        plate_number: user.plateNumber || null,
        approval_status: user.approvalStatus || (user.role === "driver" ? "pending" : "approved"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

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
