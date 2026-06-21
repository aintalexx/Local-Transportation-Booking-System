import { supabase } from "../lib/supabase";
import type { UserData } from "./userDatabase";
import {
  getDeviceId,
  getDeviceName,
  getSessionAccountKey,
  getSessionId,
  isCurrentDeviceTrusted,
} from "./sessionControls";

const ACTIVE_SESSION_WINDOW_MS = 30 * 60 * 1000;
const CONCURRENT_SESSION_WARNING_THRESHOLD = 3;

function activeSinceIso(): string {
  return new Date(Date.now() - ACTIVE_SESSION_WINDOW_MS).toISOString();
}

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function getProfileId(user: UserData): string | null {
  return isUuid(user.supabaseId) ? user.supabaseId : null;
}

type SupabaseSessionResult = {
  activeSessionCount: number;
  concurrentSessionCount: number;
  shouldWarnConcurrentLimit: boolean;
};

export async function registerSupabaseSession(user: UserData, rememberDevice: boolean): Promise<SupabaseSessionResult | null> {
  if (!supabase) return null;

  const accountKey = getSessionAccountKey(user);
  const sessionId = getSessionId();
  const now = new Date().toISOString();
  const trusted = rememberDevice || isCurrentDeviceTrusted(accountKey);

  try {
    const { error: upsertError } = await supabase
      .from("app_sessions")
      .upsert({
        session_id: sessionId,
        account_key: accountKey,
        profile_id: getProfileId(user),
        username: user.username || null,
        email: user.email || null,
        role: user.role,
        device_id: getDeviceId(),
        device_name: getDeviceName(),
        trusted,
        created_at: now,
        last_seen_at: now,
        revoked_at: null,
      }, { onConflict: "session_id" });

    if (upsertError) throw upsertError;

    const { count, error: countError } = await supabase
      .from("app_sessions")
      .select("session_id", { count: "exact", head: true })
      .eq("account_key", accountKey)
      .is("revoked_at", null)
      .gte("last_seen_at", activeSinceIso());

    if (countError) throw countError;

    const activeSessionCount = count || 0;
    return {
      activeSessionCount,
      concurrentSessionCount: Math.max(activeSessionCount - 1, 0),
      shouldWarnConcurrentLimit: activeSessionCount >= CONCURRENT_SESSION_WARNING_THRESHOLD,
    };
  } catch (error) {
    console.info("Supabase concurrent session tracking is unavailable:", error);
    return null;
  }
}

export async function touchSupabaseSession(user: UserData): Promise<SupabaseSessionResult | null> {
  if (!supabase) return null;

  const accountKey = getSessionAccountKey(user);

  try {
    const { error: updateError } = await supabase
      .from("app_sessions")
      .update({
        last_seen_at: new Date().toISOString(),
        trusted: isCurrentDeviceTrusted(accountKey),
      })
      .eq("session_id", getSessionId());

    if (updateError) throw updateError;

    const { count, error: countError } = await supabase
      .from("app_sessions")
      .select("session_id", { count: "exact", head: true })
      .eq("account_key", accountKey)
      .is("revoked_at", null)
      .gte("last_seen_at", activeSinceIso());

    if (countError) throw countError;

    const activeSessionCount = count || 0;
    return {
      activeSessionCount,
      concurrentSessionCount: Math.max(activeSessionCount - 1, 0),
      shouldWarnConcurrentLimit: activeSessionCount >= CONCURRENT_SESSION_WARNING_THRESHOLD,
    };
  } catch (error) {
    console.info("Supabase session heartbeat is unavailable:", error);
    return null;
  }
}

export async function clearSupabaseSession(): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from("app_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("session_id", getSessionId());
  } catch (error) {
    console.info("Supabase session revoke is unavailable:", error);
  }
}

export async function signOutAllSupabaseSessions(user: UserData): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from("app_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("account_key", getSessionAccountKey(user))
      .is("revoked_at", null);
  } catch (error) {
    console.info("Supabase all-session revoke is unavailable:", error);
  }
}
