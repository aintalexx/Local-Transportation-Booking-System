import { supabase } from "../lib/supabase";
import { getCurrentSupabaseUserId } from "./supabaseProfiles";

export type SoftDeleteTable = "profiles" | "drivers" | "bookings" | "ratings";

export type SoftDeleteFields = {
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  restoredAt?: string;
  restoredBy?: string;
};

export function isSoftDeletedRecord(record: {
  isDeleted?: boolean;
  is_deleted?: boolean;
  deletedAt?: string | null;
  deleted_at?: string | null;
  accountStatus?: string | null;
  account_status?: string | null;
}): boolean {
  return Boolean(
    record.isDeleted ||
    record.is_deleted ||
    record.deletedAt ||
    record.deleted_at ||
    String(record.accountStatus || record.account_status || "").toLowerCase() === "archived"
  );
}

export function applyLocalSoftDelete<T extends Record<string, unknown>>(record: T, deletedBy?: string): T & SoftDeleteFields {
  return {
    ...record,
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
    restoredAt: undefined,
    restoredBy: undefined,
  };
}

export function applyLocalRestore<T extends Record<string, unknown>>(record: T, restoredBy?: string): T & SoftDeleteFields {
  return {
    ...record,
    isDeleted: false,
    deletedAt: undefined,
    deletedBy: undefined,
    restoredAt: new Date().toISOString(),
    restoredBy,
  };
}

export async function softDeleteSupabaseRecord(
  table: SoftDeleteTable,
  id: string,
  extraUpdates: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase is not configured." };

  const actorId = await getCurrentSupabaseUserId();
  const { error } = await supabase
    .from(table)
    .update({
      ...extraUpdates,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorId,
      restored_at: null,
      restored_by: null,
    })
    .eq("id", id);

  return error ? { success: false, error: error.message } : { success: true };
}

export async function restoreSupabaseRecord(
  table: SoftDeleteTable,
  id: string,
  extraUpdates: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase is not configured." };

  const actorId = await getCurrentSupabaseUserId();
  const { error } = await supabase
    .from(table)
    .update({
      ...extraUpdates,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      restored_at: new Date().toISOString(),
      restored_by: actorId,
    })
    .eq("id", id);

  return error ? { success: false, error: error.message } : { success: true };
}

export async function softDeleteCurrentUserAccount(user: {
  supabaseId?: string;
  username: string;
  role: "passenger" | "driver" | "admin";
}): Promise<{ success: boolean; error?: string }> {
  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return { success: true };

  const profileResult = await softDeleteSupabaseRecord("profiles", userId, {
    account_status: "Archived",
  });
  if (!profileResult.success) return profileResult;

  if (user.role === "driver") {
    await softDeleteSupabaseRecord("drivers", userId, {
      account_status: "Archived",
      approval_status: "rejected",
    });
  }

  return { success: true };
}
