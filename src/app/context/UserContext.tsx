import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import type { UserData } from "../utils/userDatabase";
import {
  clearCurrentSession,
  DEFAULT_IDLE_TIMEOUT_MS,
  forgetCurrentTrustedDevice,
  formatTimeout,
  getConcurrentSessionCount,
  getIdleTimeoutMs,
  registerUserSession,
  SESSION_SIGN_OUT_ALL_KEY,
  shouldSessionSignOut,
  signOutAllSessions,
  touchCurrentSession,
  type SessionRecord,
} from "../utils/sessionControls";
import {
  clearSupabaseSession,
  registerSupabaseSession,
  signOutAllSupabaseSessions,
  touchSupabaseSession,
} from "../utils/supabaseSessions";

type SetUserOptions = {
  rememberTrustedDevice?: boolean;
};

interface UserContextType {
  user: UserData | null;
  currentSession: SessionRecord | null;
  setUser: (user: UserData | null, options?: SetUserOptions) => void;
  logout: () => void;
  signOutAllDevices: () => Promise<void>;
  forgetTrustedDevice: () => void;
  isTrustedDevice: boolean;
  concurrentSessionCount: number;
  idleTimeoutMinutes: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function showConcurrentSessionWarning() {
  toast.warning("Concurrent login warning", {
    description: (
      <span style={{ color: "#4B0F14", fontWeight: 600 }}>
        This account is signed in on 3 or more browsers/devices.
      </span>
    ),
    duration: 7000,
    style: {
      background: "#FFF8E7",
      border: "1px solid rgba(75, 15, 20, 0.18)",
      color: "#4B0F14",
    },
  });
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(() => {
    try {
      const currentUser = localStorage.getItem("current_user");
      if (!currentUser) return null;

      const parsedUser = JSON.parse(currentUser) as UserData;
      if (shouldSessionSignOut(parsedUser)) {
        localStorage.removeItem("current_user");
        return null;
      }
      return parsedUser;
    } catch {
      localStorage.removeItem("current_user");
      return null;
    }
  });
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);
  const [concurrentSessionCount, setConcurrentSessionCount] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const userRef = useRef<UserData | null>(user);

  const clearLocalUser = useCallback((userToClear: UserData | null, clearSession = true) => {
    if (clearSession) {
      clearCurrentSession(userToClear);
      void clearSupabaseSession();
    }
    localStorage.removeItem("current_user");
    setUserState(null);
    setCurrentSession(null);
    setConcurrentSessionCount(0);
    userRef.current = null;
  }, []);

  const setUser = useCallback((userData: UserData | null, options: SetUserOptions = {}) => {
    clearLocalUser(userRef.current);

    if (userData) {
      const sessionResult = registerUserSession(userData, Boolean(options.rememberTrustedDevice));
      localStorage.setItem("current_user", JSON.stringify(userData));
      setUserState(userData);
      setCurrentSession(sessionResult.currentSession);
      setConcurrentSessionCount(sessionResult.concurrentSessions.length);
      userRef.current = userData;
      lastActivityRef.current = Date.now();
      console.log("Current user set:", userData.username);

      if (sessionResult.concurrentSessions.length + 1 >= 3) {
        showConcurrentSessionWarning();
      }

      void registerSupabaseSession(userData, Boolean(options.rememberTrustedDevice)).then((remoteSessionResult) => {
        if (!remoteSessionResult) return;
        setConcurrentSessionCount(remoteSessionResult.concurrentSessionCount);

        if (remoteSessionResult.shouldWarnConcurrentLimit) {
          showConcurrentSessionWarning();
        }
      });
    } else {
      console.log("User session cleared");
      if (supabase) {
        supabase.auth.signOut().catch(err => console.error("SignOut error during setUser(null):", err));
      }
    }
  }, [clearLocalUser]);

  const logout = useCallback(async () => {
    clearLocalUser(userRef.current);
    if (supabase) {
      await supabase.auth.signOut().catch(err => console.error("Supabase signOut error:", err));
    }
    console.log("User logged out and session cleared");
  }, [clearLocalUser]);

  const signOutAllDevices = useCallback(async () => {
    const activeUser = userRef.current;
    if (!activeUser) return;

    signOutAllSessions(activeUser);
    await signOutAllSupabaseSessions(activeUser);
    localStorage.removeItem("current_user");
    setUserState(null);
    setCurrentSession(null);
    setConcurrentSessionCount(0);
    userRef.current = null;

    if (supabase) {
      await supabase.auth.signOut({ scope: "global" }).catch(async (err) => {
        console.error("Supabase global signOut error:", err);
        await supabase.auth.signOut().catch(signOutErr => console.error("Supabase signOut fallback error:", signOutErr));
      });
    }
    toast.success("Signed out on all devices.");
  }, []);

  const forgetTrustedDevice = useCallback(() => {
    const activeUser = userRef.current;
    if (!activeUser) return;

    forgetCurrentTrustedDevice(activeUser);
    const session = touchCurrentSession(activeUser);
    setCurrentSession(session);
    toast.success("This device is no longer trusted.");
  }, []);

  useEffect(() => {
    userRef.current = user;
    if (user) {
      const session = touchCurrentSession(user);
      setCurrentSession(session);
      setConcurrentSessionCount(getConcurrentSessionCount(user));
      lastActivityRef.current = Date.now();
      void touchSupabaseSession(user).then((remoteSessionResult) => {
        if (remoteSessionResult) {
          setConcurrentSessionCount(remoteSessionResult.concurrentSessionCount);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const activityEvents = ["click", "keydown", "mousemove", "touchstart", "scroll"];
    const markActive = () => {
      lastActivityRef.current = Date.now();
      if (userRef.current) {
        const session = touchCurrentSession(userRef.current);
        setCurrentSession(session);
        setConcurrentSessionCount(getConcurrentSessionCount(userRef.current));
      }
    };

    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));

    const timer = window.setInterval(() => {
      const activeUser = userRef.current;
      if (!activeUser) return;

      if (shouldSessionSignOut(activeUser)) {
        clearLocalUser(activeUser, false);
        toast.info("You were signed out because this account was signed out on another device.");
        return;
      }

      const timeoutMs = getIdleTimeoutMs(activeUser) || DEFAULT_IDLE_TIMEOUT_MS;
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        clearLocalUser(activeUser);
        if (supabase) {
          supabase.auth.signOut().catch(err => console.error("Supabase idle signOut error:", err));
        }
        toast.info(`Session expired after ${formatTimeout(timeoutMs)} of inactivity.`);
        return;
      }

      void touchSupabaseSession(activeUser).then((remoteSessionResult) => {
        if (remoteSessionResult) {
          setConcurrentSessionCount(remoteSessionResult.concurrentSessionCount);
        }
      });
    }, 15000);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive));
      window.clearInterval(timer);
    };
  }, [user, clearLocalUser]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_SIGN_OUT_ALL_KEY || !userRef.current) return;
      if (!shouldSessionSignOut(userRef.current)) return;
      clearLocalUser(userRef.current, false);
      toast.info("You were signed out because this account was signed out on another device.");
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearLocalUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        currentSession,
        setUser,
        logout,
        signOutAllDevices,
        forgetTrustedDevice,
        isTrustedDevice: Boolean(currentSession?.trusted),
        concurrentSessionCount,
        idleTimeoutMinutes: Math.round((user ? getIdleTimeoutMs(user) : DEFAULT_IDLE_TIMEOUT_MS) / 60000),
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
