import { supabase } from "../lib/supabase";
import { getCurrentSupabaseUserId } from "./supabaseProfiles";
import type { UserData } from "./userDatabase";

export type AdminLogType = "admin" | "driver" | "user" | "system";

export type AdminActivityLog = {
  id: string;
  adminId: string;
  adminLabel: string;
  action: string;
  actionType: AdminLogType;
  target: string;
  details?: string;
  timestamp: string;
};

type LogInput = {
  action: string;
  actionType: AdminLogType;
  target: string;
  details?: string;
};

const LOCAL_ADMIN_LOGS_KEY = "ridestamesa_admin_activity_logs";
const DEFAULT_SUPER_ADMIN_EMAIL = "admin@arangkada.ph";
const DEFAULT_SUPER_ADMIN_USERNAME = "admin";

function readLocalLogs(): AdminActivityLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_LOGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalLogs(logs: AdminActivityLog[]): void {
  try {
    localStorage.setItem(LOCAL_ADMIN_LOGS_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch {}
}

export function getCurrentAdminUser(): UserData | null {
  try {
    const raw = localStorage.getItem("current_user");
    if (!raw) return null;
    const user = JSON.parse(raw) as UserData;
    return user.role === "admin" ? user : null;
  } catch {
    return null;
  }
}

export function isSuperAdmin(user: UserData | null): boolean {
  if (!user) return false;
  return (
    user.username?.toLowerCase() === DEFAULT_SUPER_ADMIN_USERNAME ||
    user.email?.trim().toLowerCase() === DEFAULT_SUPER_ADMIN_EMAIL ||
    user.accountStatus === "Active" && user.approvalStatus === "approved" && user.username?.toLowerCase().includes("super")
  );
}

function getAdminLabel(user: UserData | null): string {
  if (!user) return "Unknown Admin";
  return user.email || user.username || user.supabaseId || "Admin";
}

export async function logAdminActivity(input: LogInput): Promise<void> {
  const admin = getCurrentAdminUser();
  const authAdminId = await getCurrentSupabaseUserId();
  const adminId = authAdminId || admin?.supabaseId || admin?.username || "local-admin";
  const timestamp = new Date().toISOString();

  const localLog: AdminActivityLog = {
    id: crypto.randomUUID(),
    adminId,
    adminLabel: getAdminLabel(admin),
    action: input.action,
    actionType: input.actionType,
    target: input.target,
    details: input.details,
    timestamp,
  };

  saveLocalLogs([localLog, ...readLocalLogs()]);

  if (!supabase || !authAdminId) return;

  const { error } = await supabase.from("audit_logs").insert({
    id: localLog.id,
    admin_id: authAdminId,
    action: input.action,
    action_type: input.actionType,
    performed_by: getAdminLabel(admin),
    target: input.target,
    details: input.details || null,
    created_at: timestamp,
  });

  if (error) {
    console.info("Unable to write audit log to Supabase; local log retained:", error.message);
  }
}

export async function getAdminActivityLogs(user: UserData | null): Promise<AdminActivityLog[]> {
  const authAdminId = await getCurrentSupabaseUserId();
  let remoteLogs: AdminActivityLog[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, admin_id, action, action_type, performed_by, target, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      remoteLogs = (data as any[]).map((row) => ({
        id: row.id,
        adminId: row.admin_id || "",
        adminLabel: row.performed_by || "Admin",
        action: row.action,
        actionType: row.action_type || "system",
        target: row.target || "System",
        details: row.details || "",
        timestamp: row.created_at,
      }));
    }
  }

  const localLogs = readLocalLogs();
  const combined = [...remoteLogs, ...localLogs];
  const deduped = Array.from(new Map(combined.map((log) => [log.id, log])).values());

  const canViewAll = isSuperAdmin(user);
  const userIds = new Set([
    authAdminId,
    user?.supabaseId,
    user?.username,
  ].filter(Boolean) as string[]);
  const userLabel = getAdminLabel(user);

  return deduped
    .filter((log) => canViewAll || userIds.has(log.adminId) || log.adminLabel === userLabel)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);
}
