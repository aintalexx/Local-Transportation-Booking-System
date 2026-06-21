import type { UserData } from "./userDatabase";

const DEVICE_ID_KEY = "ridestamesa_device_id";
const SESSION_ID_KEY = "ridestamesa_session_id";
const SESSIONS_KEY = "ridestamesa_sessions";
const TRUSTED_DEVICES_KEY = "ridestamesa_trusted_devices";
export const SESSION_SIGN_OUT_ALL_KEY = "ridestamesa_signout_all";

export const DEFAULT_IDLE_TIMEOUT_MS = 3 * 60 * 1000;
export const TRUSTED_IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const ACTIVE_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SessionRecord = {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  trusted: boolean;
  createdAt: number;
  lastSeenAt: number;
  revokedAt?: number;
};

type SessionMap = Record<string, SessionRecord[]>;
type TrustedDeviceMap = Record<string, string[]>;
type SignOutAllMap = Record<string, number>;

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function randomId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `${prefix}_${cryptoApi.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function getSessionMap(): SessionMap {
  return safeJson(getLocalStorage()?.getItem(SESSIONS_KEY) || null, {});
}

function saveSessionMap(sessions: SessionMap): void {
  getLocalStorage()?.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getTrustedDeviceMap(): TrustedDeviceMap {
  return safeJson(getLocalStorage()?.getItem(TRUSTED_DEVICES_KEY) || null, {});
}

function saveTrustedDeviceMap(devices: TrustedDeviceMap): void {
  getLocalStorage()?.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
}

function getSignOutAllMap(): SignOutAllMap {
  return safeJson(getLocalStorage()?.getItem(SESSION_SIGN_OUT_ALL_KEY) || null, {});
}

function saveSignOutAllMap(signOuts: SignOutAllMap): void {
  getLocalStorage()?.setItem(SESSION_SIGN_OUT_ALL_KEY, JSON.stringify(signOuts));
}

export function getSessionAccountKey(user: Pick<UserData, "username" | "email" | "phoneNumber" | "supabaseId">): string {
  return (user.supabaseId || user.email || user.phoneNumber || user.username || "").trim().toLowerCase();
}

export function getDeviceId(): string {
  const storage = getLocalStorage();
  const existing = storage?.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const next = randomId("device");
  storage?.setItem(DEVICE_ID_KEY, next);
  return next;
}

export function getSessionId(): string {
  const storage = getSessionStorage();
  const existing = storage?.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const next = randomId("session");
  storage?.setItem(SESSION_ID_KEY, next);
  return next;
}

export function getDeviceName(): string {
  const nav = globalThis.navigator;
  if (!nav) return "Current browser";
  const platform = nav.platform || "Browser";
  const browser = nav.userAgent.includes("Edg")
    ? "Edge"
    : nav.userAgent.includes("Chrome")
      ? "Chrome"
      : nav.userAgent.includes("Firefox")
        ? "Firefox"
        : nav.userAgent.includes("Safari")
          ? "Safari"
          : "Browser";
  return `${browser} on ${platform}`;
}

export function isCurrentDeviceTrusted(accountKey: string): boolean {
  const trustedDevices = getTrustedDeviceMap();
  return (trustedDevices[accountKey] || []).includes(getDeviceId());
}

export function forgetCurrentTrustedDevice(accountOrKey: string | Pick<UserData, "username" | "email" | "phoneNumber" | "supabaseId">): void {
  const accountKey = typeof accountOrKey === "string" ? accountOrKey : getSessionAccountKey(accountOrKey);
  const currentDeviceId = getDeviceId();
  const currentSessionId = getSessionId();
  const trustedDevices = getTrustedDeviceMap();
  trustedDevices[accountKey] = (trustedDevices[accountKey] || []).filter((deviceId) => deviceId !== currentDeviceId);
  saveTrustedDeviceMap(trustedDevices);

  const sessions = getSessionMap();
  sessions[accountKey] = (sessions[accountKey] || []).map((session) =>
    session.sessionId === currentSessionId || session.deviceId === currentDeviceId
      ? { ...session, trusted: false }
      : session
  );
  saveSessionMap(sessions);
}

function rememberTrustedDevice(accountKey: string): void {
  const trustedDevices = getTrustedDeviceMap();
  trustedDevices[accountKey] = Array.from(new Set([...(trustedDevices[accountKey] || []), getDeviceId()]));
  saveTrustedDeviceMap(trustedDevices);
}

function getActiveSessions(accountKey: string, sessions = getSessionMap()): SessionRecord[] {
  const now = Date.now();
  return (sessions[accountKey] || []).filter((session) => {
    return !session.revokedAt && now - session.lastSeenAt < ACTIVE_SESSION_WINDOW_MS;
  });
}

export function registerUserSession(user: UserData, rememberDevice: boolean) {
  const accountKey = getSessionAccountKey(user);
  const deviceId = getDeviceId();
  const sessionId = getSessionId();
  const now = Date.now();
  const shouldTrust = rememberDevice || isCurrentDeviceTrusted(accountKey);

  if (shouldTrust) rememberTrustedDevice(accountKey);

  const sessions = getSessionMap();
  const activeSessions = getActiveSessions(accountKey, sessions).filter((session) => session.sessionId !== sessionId);
  const currentSession: SessionRecord = {
    sessionId,
    deviceId,
    deviceName: getDeviceName(),
    trusted: shouldTrust,
    createdAt: now,
    lastSeenAt: now,
  };

  sessions[accountKey] = [
    currentSession,
    ...activeSessions,
  ].slice(0, 12);
  saveSessionMap(sessions);

  return {
    accountKey,
    currentSession,
    concurrentSessions: activeSessions,
    hasConcurrentSession: activeSessions.length > 0,
  };
}

export function touchCurrentSession(user: UserData): SessionRecord | null {
  const accountKey = getSessionAccountKey(user);
  const sessionId = getSessionId();
  const sessions = getSessionMap();
  const activeSessions = getActiveSessions(accountKey, sessions);
  const current = activeSessions.find((session) => session.sessionId === sessionId);

  if (!current) {
    return registerUserSession(user, isCurrentDeviceTrusted(accountKey)).currentSession;
  }

  current.lastSeenAt = Date.now();
  current.trusted = current.trusted || isCurrentDeviceTrusted(accountKey);
  sessions[accountKey] = [
    current,
    ...activeSessions.filter((session) => session.sessionId !== sessionId),
  ];
  saveSessionMap(sessions);
  return current;
}

export function clearCurrentSession(user: UserData | null): void {
  if (!user) return;
  const accountKey = getSessionAccountKey(user);
  const sessionId = getSessionId();
  const sessions = getSessionMap();
  sessions[accountKey] = (sessions[accountKey] || []).map((session) =>
    session.sessionId === sessionId ? { ...session, revokedAt: Date.now() } : session
  );
  saveSessionMap(sessions);
}

export function getConcurrentSessionCount(user: UserData): number {
  const accountKey = getSessionAccountKey(user);
  const sessionId = getSessionId();
  return getActiveSessions(accountKey).filter((session) => session.sessionId !== sessionId).length;
}

export function signOutAllSessions(user: UserData): void {
  const accountKey = getSessionAccountKey(user);
  const now = Date.now();
  const sessions = getSessionMap();
  sessions[accountKey] = (sessions[accountKey] || []).map((session) => ({ ...session, revokedAt: now }));
  saveSessionMap(sessions);

  const signOuts = getSignOutAllMap();
  signOuts[accountKey] = now;
  saveSignOutAllMap(signOuts);
}

export function shouldSessionSignOut(user: UserData): boolean {
  const accountKey = getSessionAccountKey(user);
  const sessionId = getSessionId();
  const sessions = getSessionMap();
  const current = (sessions[accountKey] || []).find((session) => session.sessionId === sessionId);
  if (current?.revokedAt) return true;

  const signOutAt = getSignOutAllMap()[accountKey] || 0;
  return Boolean(current && signOutAt > current.createdAt);
}

export function getIdleTimeoutMs(user: UserData): number {
  return isCurrentDeviceTrusted(getSessionAccountKey(user)) ? TRUSTED_IDLE_TIMEOUT_MS : DEFAULT_IDLE_TIMEOUT_MS;
}

export function formatTimeout(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minutes`;
  return `${Math.round(minutes / 60)} hours`;
}
