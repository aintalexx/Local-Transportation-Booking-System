import {
  createContext, useContext, useState, useCallback, useRef, useEffect,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { getAllUsers, updateUser } from "../../utils/userDatabase";

/** Returns true if the string looks like a Supabase UUID */
function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ─── Shared types ─────────────────────────────────────────────────────────────
export type DriverStatus  = "Active" | "Pending" | "Blocked" | "Archived";
export type LicenseStatus = "Approved" | "Pending" | "Blocked";
export type BookingStatus = "Completed" | "Ongoing" | "Cancelled" | "Pending";
export type NotifType     = "success" | "warning" | "info" | "error";

const ARCHIVED_KEY = "ridestamesa_archived_drivers";

function getArchivedDrivers(): Driver[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveArchivedDrivers(list: Driver[]): void {
  try { localStorage.setItem(ARCHIVED_KEY, JSON.stringify(list)); } catch {}
}

// Visual flash direction for row highlight
export type ChangeHint = "success" | "warning" | "error";

export interface Driver {
  id: string; name: string; photo: string; vehicle: string; plate: string;
  route: string; rides: number; rating: number; status: DriverStatus;
  license: LicenseStatus; joined: string; bg: string; phone: string;
  licenseNumber?: string;
  driverLicensePhoto?: string;
  validIdPhoto?: string;
  orCrPhoto?: string;
  clearancePhoto?: string;
  vehiclePhoto?: string;
  profilePhoto?: string;
}

export interface Booking {
  id: string; passenger: string; passengerPhone: string;
  driver: string; driverPhone: string; vehicle: string;
  from: string; to: string; fare: string; distance: string;
  duration: string; status: BookingStatus;
  booked: string; ended: string; seats: number;
}

export interface AppNotification {
  id: number; type: NotifType;
  title: string; body: string; time: string; read: boolean;
}

let notifSeq = 0;

// Helper to map a local UserData driver to the Driver admin type
function mapLocalUserToDriver(u: any): Driver {
  const initials = [u.firstName, u.surname]
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DR";

  const colors = ["#6B0E1A", "#C49A1A", "#7c3aed", "#15803d", "#b45309", "#0e7490", "#9f1239"];
  const name = `${u.firstName || ""} ${u.surname || ""}`.trim();
  const charCodeSum = name.split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  const bg = colors[charCodeSum % colors.length];

  const status: DriverStatus = u.approvalStatus === "pending"
    ? "Pending"
    : u.approvalStatus === "rejected"
    ? "Blocked"
    : "Active";

  const license: LicenseStatus = u.approvalStatus === "pending"
    ? "Pending"
    : u.approvalStatus === "rejected"
    ? "Blocked"
    : "Approved";

  return {
    id: u.supabaseId || u.username,   // use username as fallback ID for local-only
    name: name || u.username,
    photo: initials,
    vehicle: u.vehicleType || "Tricycle",
    plate: u.plateNumber || "N/A",
    route: "Sta. Mesa Local Route",
    rides: u.totalTrips || 0,
    rating: u.rating || 5.0,
    status,
    license,
    joined: u.memberSince || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    bg,
    phone: u.phoneNumber || "",
    licenseNumber: u.licenseNumber || "N/A",
    driverLicensePhoto: u.driverLicensePhoto || "",
    validIdPhoto: u.validIdPhoto || "",
    orCrPhoto: u.orCrPhoto || "",
    clearancePhoto: u.clearancePhoto || "",
    vehiclePhoto: u.vehiclePhoto || "",
    profilePhoto: u.profilePhoto || "",
  };
}

// Helper to map Supabase profiles to Driver
function mapProfileToDriver(p: any): Driver {
  const localUsers = getAllUsers();
  const localUser = localUsers.find(u =>
    (u.supabaseId && u.supabaseId === p.id) ||
    (u.phoneNumber && p.phone && u.phoneNumber.replace(/\D/g, "") === p.phone.replace(/\D/g, "")) ||
    (u.username && p.username && u.username.toLowerCase() === p.username.toLowerCase())
  );

  const initials = p.full_name
    ? p.full_name.split(/\s+/).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "DR";

  const colors = ["#6B0E1A", "#C49A1A", "#7c3aed", "#15803d", "#b45309", "#0e7490", "#9f1239"];
  const charCodeSum = (p.full_name || "").split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  const bg = colors[charCodeSum % colors.length];

  const status: DriverStatus = p.approval_status === "pending"
    ? "Pending"
    : p.approval_status === "rejected"
    ? "Blocked"
    : "Active";

  const license: LicenseStatus = p.approval_status === "pending"
    ? "Pending"
    : p.approval_status === "rejected"
    ? "Blocked"
    : "Approved";

  return {
    id: p.id,
    name: p.full_name,
    photo: initials,
    vehicle: p.vehicle_type || "Tricycle",
    plate: p.plate_number || "N/A",
    route: "Sta. Mesa Local Route",
    rides: 0,
    rating: 5.0,
    status,
    license,
    joined: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    bg,
    phone: p.phone || "",
    licenseNumber: p.license_number || localUser?.licenseNumber || "N/A",
    driverLicensePhoto: p.driver_license_photo || localUser?.driverLicensePhoto || "",
    validIdPhoto: p.valid_id_photo || localUser?.validIdPhoto || localUser?.driverLicensePhoto || "",
    orCrPhoto: p.or_cr_photo || localUser?.orCrPhoto || "",
    clearancePhoto: p.clearance_photo || localUser?.clearancePhoto || "",
    vehiclePhoto: p.vehicle_photo || localUser?.vehiclePhoto || "",
    profilePhoto: p.profile_photo || localUser?.profilePhoto || "",
  };
}

// Helper to map Supabase bookings to Booking
function mapRowToBooking(b: any): Booking {
  let status: BookingStatus = "Pending";
  if (b.status === "completed") status = "Completed";
  else if (b.status === "cancelled") status = "Cancelled";
  else if (b.status === "pending") status = "Pending";
  else status = "Ongoing";

  return {
    id: b.id,
    passenger: b.passenger_name,
    passengerPhone: b.passenger_phone || "",
    driver: b.driver_name || "Searching...",
    driverPhone: b.driver_phone || "",
    vehicle: b.driver_plate_number || "—",
    from: b.pickup_address,
    to: b.destination_address,
    fare: `₱${b.final_price}`,
    distance: `${b.distance_km} km`,
    duration: "—",
    status,
    booked: new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + new Date(b.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    ended: b.completed_at ? new Date(b.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + new Date(b.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—",
    seats: b.ride_type === "shared" ? 2 : 1,
  };
}

// ─── Context interface ────────────────────────────────────────────────────────
interface AppStateContextValue {
  drivers:        Driver[];
  archivedDrivers: Driver[];
  bookings:       Booking[];
  notifications:  AppNotification[];
  recentChanges:  Record<string, ChangeHint>;

  pendingDriverCount: number;
  unreadCount:        number;

  approveDriver(id: string): void;
  rejectDriver(id: string): void;
  blockDriver(id: string): void;
  reinstateDriver(id: string): void;
  approveBatch(): void;
  archiveDriver(id: string): void;
  restoreDriver(id: string): void;

  cancelBooking(id: string): void;

  markRead(id: number): void;
  markAllRead(): void;
}

const AppStateContext = createContext<AppStateContextValue>({} as AppStateContextValue);

export function useAppState() {
  return useContext(AppStateContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [drivers,          setDrivers]          = useState<Driver[]>([]);
  const [archivedDrivers,  setArchivedDrivers]  = useState<Driver[]>(getArchivedDrivers);
  const [bookings,         setBookings]         = useState<Booking[]>([]);
  const [notifications,    setNotifications]    = useState<AppNotification[]>([]);
  const [recentChanges,    setRecentChanges]    = useState<Record<string, ChangeHint>>({});

  const clearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function flashRow(id: string, hint: ChangeHint) {
    if (clearTimers.current[id]) clearTimeout(clearTimers.current[id]);
    setRecentChanges((prev) => ({ ...prev, [id]: hint }));
    clearTimers.current[id] = setTimeout(() => {
      setRecentChanges((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 2200);
  }

  function pushNotification(n: Omit<AppNotification, "id" | "read">) {
    notifSeq += 1;
    setNotifications((prev) => [{ ...n, id: notifSeq, read: false }, ...prev]);
  }

  // Fetch initial data and set up real-time subscriptions
  useEffect(() => {

    async function loadDrivers() {
      let supabaseDrivers: Driver[] = [];

      if (supabase) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "driver")
          .order("created_at", { ascending: false });

        if (!error && data) {
          supabaseDrivers = data.map(mapProfileToDriver);
        }
      }

      // Always merge with localStorage drivers so admin sees locally-registered drivers
      const localUsers = getAllUsers();
      const localDrivers = localUsers
        .filter(u => u.role === "driver")
        .map(mapLocalUserToDriver);

      // Deduplicate: prefer Supabase record if the same driver exists in both
      const merged = [...supabaseDrivers];
      for (const ld of localDrivers) {
        const alreadyInSupabase = supabaseDrivers.some(sd =>
          (ld.phone && sd.phone && ld.phone.replace(/\D/g, "") === sd.phone.replace(/\D/g, "")) ||
          sd.id === ld.id
        );
        if (!alreadyInSupabase) {
          merged.push(ld);
        }
      }

      setDrivers(merged);
    }

    async function loadBookings() {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBookings(data.map(mapRowToBooking));
      }
    }

    loadDrivers();

    if (!supabase) return;

    loadBookings();

    const profilesChannel = supabase
      .channel("admin-profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: "role=eq.driver" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newDriver = mapProfileToDriver(payload.new);
            setDrivers((prev) => {
              if (prev.some(d => d.id === newDriver.id)) return prev;
              return [newDriver, ...prev];
            });
            pushNotification({
              type: "info",
              title: "New Driver Registration",
              body: `${newDriver.name} submitted a new driver application.`,
              time: "Just now",
            });
            flashRow(newDriver.id, "success");
          } else if (payload.eventType === "UPDATE") {
            const updatedDriver = mapProfileToDriver(payload.new);
            setDrivers((prev) => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
            flashRow(updatedDriver.id, "success");
          } else if (payload.eventType === "DELETE") {
            setDrivers((prev) => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel("admin-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newBooking = mapRowToBooking(payload.new);
            setBookings((prev) => {
              if (prev.some(b => b.id === newBooking.id)) return prev;
              return [newBooking, ...prev];
            });
            pushNotification({
              type: "success",
              title: "New Booking Created",
              body: `${newBooking.passenger} booked a ride to ${newBooking.to}.`,
              time: "Just now",
            });
            flashRow(newBooking.id, "success");
          } else if (payload.eventType === "UPDATE") {
            const updatedBooking = mapRowToBooking(payload.new);
            setBookings((prev) => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
            flashRow(updatedBooking.id, "success");
          } else if (payload.eventType === "DELETE") {
            setBookings((prev) => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  // ─── Driver actions ───────────────────────────────────────────────────────

  /**
   * Update a locally-registered driver's status in localStorage + local state.
   * Used when the driver ID is not a Supabase UUID (e.g. "driver_09321312313").
   */
  function updateLocalDriver(
    id: string,
    approvalStatus: "approved" | "rejected",
    newStatus: DriverStatus,
    newLicense: LicenseStatus,
  ) {
    // id is the username for local-only drivers
    updateUser(id, { approvalStatus });
    setDrivers(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, status: newStatus, license: newLicense }
          : d
      )
    );
    flashRow(id, approvalStatus === "approved" ? "success" : "error");
  }

  const approveDriver = useCallback(async (id: string) => {
    // Local-only driver — update localStorage directly
    if (!isUUID(id)) {
      updateLocalDriver(id, "approved", "Active", "Approved");
      toast.success("Driver approved successfully");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to approve driver", { description: error.message });
    } else {
      toast.success("Driver approved successfully");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rejectDriver = useCallback(async (id: string) => {
    if (!isUUID(id)) {
      updateLocalDriver(id, "rejected", "Blocked", "Blocked");
      toast.success("Driver application rejected");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to reject driver", { description: error.message });
    } else {
      toast.success("Driver application rejected");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockDriver = useCallback(async (id: string) => {
    if (!isUUID(id)) {
      updateLocalDriver(id, "rejected", "Blocked", "Blocked");
      toast.warning("Driver blocked successfully");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to block driver", { description: error.message });
    } else {
      toast.warning("Driver blocked successfully");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reinstateDriver = useCallback(async (id: string) => {
    if (!isUUID(id)) {
      updateLocalDriver(id, "approved", "Active", "Approved");
      toast.success("Driver reinstated successfully");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to reinstate driver", { description: error.message });
    } else {
      toast.success("Driver reinstated successfully");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveBatch = useCallback(async () => {
    const pendingDrivers = drivers.filter(d => d.status === "Pending");
    if (pendingDrivers.length === 0) {
      toast.info("No pending drivers to approve.");
      return;
    }

    // Split into local vs Supabase
    const localPending  = pendingDrivers.filter(d => !isUUID(d.id));
    const supabasePending = pendingDrivers.filter(d =>  isUUID(d.id));

    // Update local drivers in localStorage + state
    for (const d of localPending) {
      updateUser(d.id, { approvalStatus: "approved" });
    }
    if (localPending.length > 0) {
      setDrivers(prev =>
        prev.map(d =>
          localPending.some(ld => ld.id === d.id)
            ? { ...d, status: "Active" as DriverStatus, license: "Approved" as LicenseStatus }
            : d
        )
      );
    }

    // Update Supabase drivers
    if (supabasePending.length > 0 && supabase) {
      const supabaseIds = supabasePending.map(d => d.id);
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "approved" })
        .in("id", supabaseIds);
      if (error) {
        toast.error("Failed to approve some drivers", { description: error.message });
        return;
      }
    }

    toast.success(`Approved ${pendingDrivers.length} driver${pendingDrivers.length > 1 ? "s" : ""}`);
  }, [drivers]);

  // ─── Archive actions ──────────────────────────────────────────────────────
  const archiveDriver = useCallback(async (id: string) => {
    // Find the driver in active list
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;

    const archived: Driver = { ...driver, status: "Archived" as DriverStatus };
    const updated = [...archivedDrivers, archived];
    setArchivedDrivers(updated);
    saveArchivedDrivers(updated);

    // Remove from active drivers
    setDrivers(prev => prev.filter(d => d.id !== id));

    // Update localStorage for local-only drivers
    if (!isUUID(id)) {
      updateUser(id, { approvalStatus: "rejected" }); // mark as rejected so they don't re-appear
    } else if (supabase) {
      // For Supabase drivers, mark as archived/rejected
      await supabase.from("profiles").update({ approval_status: "rejected" }).eq("id", id);
    }

    toast.success(`${driver.name} has been archived.`);
    pushNotification({
      type: "warning",
      title: "Driver Archived",
      body: `${driver.name} was moved to the archive.`,
      time: "Just now",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, archivedDrivers]);

  const restoreDriver = useCallback(async (id: string) => {
    const driver = archivedDrivers.find(d => d.id === id);
    if (!driver) return;

    const restored: Driver = { ...driver, status: "Active" as DriverStatus, license: "Approved" as LicenseStatus };

    // Remove from archive
    const updatedArchive = archivedDrivers.filter(d => d.id !== id);
    setArchivedDrivers(updatedArchive);
    saveArchivedDrivers(updatedArchive);

    // Add back to active drivers
    setDrivers(prev => [restored, ...prev]);
    flashRow(id, "success");

    // Update storage
    if (!isUUID(id)) {
      updateUser(id, { approvalStatus: "approved" });
    } else if (supabase) {
      await supabase.from("profiles").update({ approval_status: "approved" }).eq("id", id);
    }

    toast.success(`${driver.name} has been restored.`);
    pushNotification({
      type: "success",
      title: "Driver Restored",
      body: `${driver.name} was restored from the archive.`,
      time: "Just now",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivedDrivers]);

  // ─── Booking actions ──────────────────────────────────────────────────────
  const cancelBooking = useCallback(async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel booking", { description: error.message });
    } else {
      toast.success("Booking cancelled successfully");
    }
  }, []);

  // ─── Notification actions ─────────────────────────────────────────────────
  const markRead = useCallback((id: number) => {
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const pendingDriverCount = drivers.filter((d) => d.status === "Pending").length;
  const unreadCount        = notifications.filter((n) => !n.read).length;

  return (
    <AppStateContext.Provider value={{
      drivers, archivedDrivers, bookings, notifications, recentChanges,
      pendingDriverCount, unreadCount,
      approveDriver, rejectDriver, blockDriver, reinstateDriver, approveBatch,
      archiveDriver, restoreDriver,
      cancelBooking,
      markRead, markAllRead,
    }}>
      {children}
    </AppStateContext.Provider>
  );
}
