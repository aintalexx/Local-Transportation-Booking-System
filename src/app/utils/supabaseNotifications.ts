import { supabase } from "../lib/supabase";
import type { UserData } from "./userDatabase";
import { getCurrentSupabaseUserId } from "./supabaseProfiles";

export type NotificationType = "ride" | "rating" | "promo" | "system";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

async function getNotificationUserId(user: UserData): Promise<string | null> {
  return user.supabaseId || await getCurrentSupabaseUserId();
}

function mapNotificationRow(row: any): AppNotification {
  return {
    id: String(row.id),
    type: normalizeNotificationType(row.type),
    title: String(row.title || "Notification"),
    message: String(row.message || row.body || ""),
    createdAt: String(row.created_at || row.timestamp || new Date().toISOString()),
    read: Boolean(row.read ?? row.is_read ?? row.read_at),
  };
}

function normalizeNotificationType(value: unknown): NotificationType {
  if (value === "ride" || value === "rating" || value === "promo" || value === "system") {
    return value;
  }
  return "system";
}

export async function getSupabaseNotifications(user: UserData): Promise<AppNotification[]> {
  if (!supabase) return [];

  const userId = await getNotificationUserId(user);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.info("Unable to fetch notifications from Supabase:", error?.message);
    return [];
  }

  return data.map(mapNotificationRow);
}

export async function getUnreadNotificationCount(user: UserData): Promise<number> {
  const notifications = await getSupabaseNotifications(user);
  return notifications.filter(notification => !notification.read).length;
}

export async function markSupabaseNotificationRead(user: UserData, notificationId: string): Promise<boolean> {
  if (!supabase) return false;

  const userId = await getNotificationUserId(user);
  if (!userId) return false;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (!error) return true;

  const { error: retryError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (retryError) {
    console.info("Unable to mark notification as read:", retryError.message);
    return false;
  }

  return true;
}

export async function markAllSupabaseNotificationsRead(user: UserData): Promise<boolean> {
  if (!supabase) return false;

  const userId = await getNotificationUserId(user);
  if (!userId) return false;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId);

  if (!error) return true;

  const { error: retryError } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId);

  if (retryError) {
    console.info("Unable to mark all notifications as read:", retryError.message);
    return false;
  }

  return true;
}
