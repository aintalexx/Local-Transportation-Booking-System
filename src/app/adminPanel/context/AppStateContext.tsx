import {
  createContext, useContext, useState, useCallback, useRef, useEffect,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { getAllUsers, getAllUsersIncludingDeleted, restoreUser, updateUser } from "../../utils/userDatabase";
import { getAllDriverRatingSummaries, subscribeToRatings } from "../../utils/supabaseRatings";
import { isSoftDeletedRecord, restoreSupabaseRecord, softDeleteSupabaseRecord } from "../../utils/softDelete";
import { validateBookingStatusTransition, validateDriverWorkflowTransition, type AdminDriverAction, type AdminDriverStatus } from "../../utils/adminWorkflowValidation";

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
const USERS_KEY = "ridestamesa_users";
const ADMIN_DRIVER_RESET_KEY = "ridestamesa_admin_driver_reset_2026_06_18_v1";
const FALLBACK_DRIVER_BG = "#6B0E1A";

function clearStoredLocalDriversOnce(): { clearedArchive: boolean } {
  try {
    if (localStorage.getItem(ADMIN_DRIVER_RESET_KEY)) {
      return { clearedArchive: false };
    }

    const rawUsers = localStorage.getItem(USERS_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        const usersWithoutDrivers = users.filter((user: any) => user?.role !== "driver");
        if (usersWithoutDrivers.length !== users.length) {
          localStorage.setItem(USERS_KEY, JSON.stringify(usersWithoutDrivers));
        }
      }
    }

    localStorage.removeItem(ARCHIVED_KEY);
    localStorage.setItem(ADMIN_DRIVER_RESET_KEY, new Date().toISOString());
    return { clearedArchive: true };
  } catch (error) {
    console.error("Unable to clear stored local drivers:", error);
    return { clearedArchive: false };
  }
}

function getArchivedDrivers(): Driver[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeDriverTheme).filter(Boolean)
      : [];
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
  ratingCount?: number;
  licenseNumber?: string;
  driverLicensePhoto?: string;
  validIdPhoto?: string;
  orCrPhoto?: string;
  clearancePhoto?: string;
  vehiclePhoto?: string;
  profilePhoto?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Booking {
  id: string; passenger: string; passengerPhone: string;
  driver: string; driverPhone: string; vehicle: string;
  from: string; to: string; fare: string; distance: string;
  duration: string; status: BookingStatus;
  booked: string; ended: string; seats: number;
  bookingType?: "solo" | "group";
  passengerCount: number;
  totalFare: number;
  individualShare: number;
  splitPaymentEnabled: boolean;
  driverEarnings: number;
}

export interface AppNotification {
  id: number; type: NotifType;
  title: string; body: string; time: string; read: boolean;
}

let notifSeq = 0;

function normalizePhone(value?: string): string {
  return String(value || "").replace(/\D/g, "");
}

function hasMeaningfulValue(value?: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized && normalized !== "n/a" && normalized !== "none" && normalized !== "-");
}

function normalizeDriverTheme(driver: any): Driver {
  if (!driver) return driver;

  const name = String(driver.name || "").trim();
  const id = String(driver.id || "").trim();
  const source = `${name} ${id}`.trim() || "driver";
  const colors = ["#6B0E1A", "#C49A1A", "#7c3aed", "#15803d", "#b45309", "#0e7490", "#9f1239"];
  const charCodeSum = source.split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);

  return {
    ...driver,
    name: name || "Unnamed Driver",
    photo: driver.photo || "DR",
    bg: driver.bg || colors[charCodeSum % colors.length] || FALLBACK_DRIVER_BG,
    vehicle: driver.vehicle || "Tricycle",
    plate: driver.plate || "N/A",
    route: driver.route || "Sta. Mesa Local Route",
    rides: Number.isFinite(Number(driver.rides)) ? Number(driver.rides) : 0,
    rating: Number.isFinite(Number(driver.rating)) ? Number(driver.rating) : 0,
    status: driver.status || "Pending",
    license: driver.license || "Pending",
    joined: driver.joined || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    phone: driver.phone || "",
  } as Driver;
}

function sameDriverRecord(a: Partial<Driver>, b: Partial<Driver>): boolean {
  return (
    (hasMeaningfulValue(a.id) && hasMeaningfulValue(b.id) && a.id === b.id) ||
    (hasMeaningfulValue(a.phone) && hasMeaningfulValue(b.phone) && normalizePhone(a.phone) === normalizePhone(b.phone)) ||
    (hasMeaningfulValue(a.plate) && hasMeaningfulValue(b.plate) && a.plate.trim().toLowerCase() === b.plate.trim().toLowerCase()) ||
    (hasMeaningfulValue(a.licenseNumber) && hasMeaningfulValue(b.licenseNumber) && a.licenseNumber.trim().toLowerCase() === b.licenseNumber.trim().toLowerCase())
  );
}

function isArchivedDriver(driver: Partial<Driver>, archive = getArchivedDrivers()): boolean {
  return archive.some(archived => sameDriverRecord(driver, archived));
}

function findMatchingLocalDriver(driver: Partial<Driver>, users = getAllUsers()) {
  return users.find(u =>
    u.role === "driver" && (
      (!!driver.id && (u.supabaseId === driver.id || u.username === driver.id)) ||
      (!!driver.phone && normalizePhone(u.phoneNumber) === normalizePhone(driver.phone)) ||
      (!!driver.plate && !!u.plateNumber && u.plateNumber.trim().toLowerCase() === driver.plate.trim().toLowerCase()) ||
      (!!driver.licenseNumber && !!u.licenseNumber && u.licenseNumber.trim().toLowerCase() === driver.licenseNumber.trim().toLowerCase())
    )
  );
}

async function syncLocalDriverApprovalToSupabase(id: string, approvalStatus: "approved" | "rejected") {
  if (!supabase) return;

  const matchedLocal = findMatchingLocalDriver({ id });
  if (!matchedLocal?.supabaseId) return;

  await supabase
    .from("profiles")
    .update({
      approval_status: approvalStatus,
      role: "driver",
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchedLocal.supabaseId);
}

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
    ratingCount: 0,
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
  } satisfies Driver;
}

// Helper to map Supabase db driver row to Driver
function mapDbDriverToAdminDriver(p: any): Driver {
  const fullName = `${p.first_name || ""} ${p.surname || ""}`.trim();
  const initials = fullName
    ? fullName.split(/\s+/).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "DR";

  const colors = ["#6B0E1A", "#C49A1A", "#7c3aed", "#15803d", "#b45309", "#0e7490", "#9f1239"];
  const charCodeSum = fullName.split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  const bg = colors[charCodeSum % colors.length];

  let status: DriverStatus = "Pending";
  if (p.account_status === "Blocked" || p.account_status === "Suspended") {
    status = "Blocked";
  } else if (p.account_status === "Archived") {
    status = "Archived";
  } else if (p.approval_status === "pending") {
    status = "Pending";
  } else if (p.approval_status === "rejected") {
    status = "Blocked";
  } else {
    status = "Active";
  }

  const license: LicenseStatus = p.approval_status === "pending"
    ? "Pending"
    : p.approval_status === "rejected"
    ? "Blocked"
    : "Approved";

  return {
    id: p.id,
    name: fullName,
    photo: initials,
    vehicle: p.vehicle_type || "Tricycle",
    plate: p.plate_number || "N/A",
    route: "Sta. Mesa Local Route",
    rides: 0,
    rating: 5.0,
    ratingCount: 0,
    status,
    license,
    joined: p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    bg,
    phone: p.phone || "",
    licenseNumber: p.license_number || "N/A",
    driverLicensePhoto: p.valid_id_photo || "",
    validIdPhoto: p.valid_id_photo || "",
    orCrPhoto: p.or_cr_photo || "",
    clearancePhoto: p.clearance_photo || "",
    vehiclePhoto: p.vehicle_photo || "",
    profilePhoto: p.profile_photo || "",
    isDeleted: Boolean(p.is_deleted),
    deletedAt: p.deleted_at || undefined,
  } satisfies Driver;
}

async function syncDriverToProfile(driverId: string) {
  if (!supabase) return;
  const { data: dbDriver, error: fetchErr } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();

  if (fetchErr || !dbDriver) {
    console.error("Failed to fetch driver for syncing to profiles:", fetchErr);
    return;
  }

  const fullName = `${dbDriver.first_name || ""} ${dbDriver.surname || ""}`.trim();
  const profilePayload = {
    id: dbDriver.id,
    username: `driver_${dbDriver.phone.replace(/\D/g, "")}`,
    full_name: fullName,
    phone: dbDriver.phone || null,
    role: "driver",
    vehicle_type: dbDriver.vehicle_type || null,
    plate_number: dbDriver.plate_number || null,
    license_number: dbDriver.license_number || null,
    driver_license_photo: dbDriver.valid_id_photo || null,
    valid_id_photo: dbDriver.valid_id_photo || null,
    or_cr_photo: dbDriver.or_cr_photo || null,
    clearance_photo: dbDriver.clearance_photo || null,
    vehicle_photo: dbDriver.vehicle_photo || null,
    profile_photo: dbDriver.profile_photo || null,
    approval_status: "approved",
    account_status: "Active",
    is_online: false,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (upsertErr) {
    console.error("Failed to sync driver to profiles table:", upsertErr.message);
  }
}

async function approveDriverApplicationInSupabase(driverId: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase not configured." };

  const { error: rpcError } = await supabase.rpc("approve_driver_application", {
    p_driver_id: driverId,
  });

  if (!rpcError) return { ok: true };

  // Fallback for local/dev databases before the latest migration is applied.
  const { error: driverError } = await supabase
    .from("drivers")
    .update({ approval_status: "approved", account_status: "Active", updated_at: new Date().toISOString() })
    .eq("id", driverId);

  if (driverError) {
    return { ok: false, error: driverError.message || rpcError.message };
  }

  await syncDriverToProfile(driverId);
  return { ok: true, error: rpcError.message };
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
    fare: `₱${b.total_fare ?? b.final_price}`,
    distance: `${b.distance_km} km`,
    duration: "—",
    status,
    booked: new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + new Date(b.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    ended: b.completed_at ? new Date(b.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + new Date(b.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—",
    seats: b.passenger_count || (b.ride_type === "shared" ? 2 : 1),
    bookingType: b.booking_type || (b.ride_type === "group" ? "group" : "solo"),
    passengerCount: b.passenger_count || 1,
    totalFare: b.total_fare ? Number(b.total_fare) : Number(b.final_price),
    individualShare: b.individual_share ? Number(b.individual_share) : Number(b.final_price),
    splitPaymentEnabled: b.split_payment_enabled || false,
    driverEarnings: b.total_fare ? Number(b.total_fare) : Number(b.final_price),
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

  function validateDriverAction(id: string, action: AdminDriverAction, source: Driver[] = drivers): Driver | null {
    const driver = source.find(d => d.id === id);
    if (!driver) return null;

    const transition = validateDriverWorkflowTransition(driver.status as AdminDriverStatus, action);
    if (!transition.valid) {
      toast.error("Invalid driver status change", { description: transition.message });
      return null;
    }

    return driver;
  }

  // Fetch initial data and set up real-time subscriptions
  useEffect(() => {
    const localReset = clearStoredLocalDriversOnce();
    if (localReset.clearedArchive) {
      setArchivedDrivers([]);
    }

    async function loadArchivedDrivers() {
      const localArchived = getArchivedDrivers();
      const localSoftDeletedDrivers = getAllUsersIncludingDeleted()
        .filter(u => u.role === "driver" && isSoftDeletedRecord(u))
        .map(mapLocalUserToDriver)
        .map(driver => normalizeDriverTheme({ ...driver, status: "Archived" as DriverStatus }));

      let supabaseArchived: Driver[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("is_deleted", true)
          .order("deleted_at", { ascending: false });

        if (!error && data) {
          supabaseArchived = data
            .map(mapDbDriverToAdminDriver)
            .map(driver => normalizeDriverTheme({ ...driver, status: "Archived" as DriverStatus }));
        }
      }

      const merged: Driver[] = [];
      [...supabaseArchived, ...localSoftDeletedDrivers, ...localArchived].forEach((driver) => {
        if (!merged.some(existing => sameDriverRecord(existing, driver))) {
          merged.push(driver);
        }
      });

      setArchivedDrivers(merged);
      saveArchivedDrivers(merged);
    }

    async function loadDrivers() {
      let supabaseDrivers: Driver[] = [];
      const ratingSummaries = supabase ? await getAllDriverRatingSummaries() : {};

      if (supabase) {
        const { data, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });

      if (!error && data) {
        const archivedSnapshot = getArchivedDrivers();
        supabaseDrivers = data
            .map(mapDbDriverToAdminDriver)
            .map(normalizeDriverTheme)
            .map(driver => {
              const summary = ratingSummaries[driver.id];
              if (!summary) return { ...driver, rating: 0, ratingCount: 0 };
              return {
                ...driver,
                rating: summary.averageRating,
                ratingCount: summary.totalRatings,
              };
            })
            .filter(driver => !isArchivedDriver(driver, archivedSnapshot) && !isSoftDeletedRecord(driver));
        }
      }

      // Always merge with localStorage drivers so admin sees locally-registered drivers
      const localUsers = getAllUsers();
      const localDrivers = localUsers
        .filter(u => u.role === "driver")
        .map(mapLocalUserToDriver)
        .map(normalizeDriverTheme)
        .filter(driver => !isArchivedDriver(driver) && !isSoftDeletedRecord(driver));

      // Deduplicate: prefer Supabase record if the same driver exists in both
      const merged = [...supabaseDrivers];
      for (const ld of localDrivers) {
        const alreadyInSupabase = supabaseDrivers.some(sd =>
          (normalizePhone(ld.phone) && normalizePhone(sd.phone) && normalizePhone(ld.phone) === normalizePhone(sd.phone)) ||
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
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setBookings(data.map(mapRowToBooking));
        return;
      }

      const { data: adminData, error: adminError } = await supabase.rpc("get_admin_bookings");
      if (!adminError && adminData) {
        setBookings((adminData as any[]).map(mapRowToBooking));
      }
    }

    loadArchivedDrivers();
    loadDrivers();

    if (!supabase) return;

    loadBookings();

    const driversChannel = supabase
      .channel("admin-drivers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newDriver = mapDbDriverToAdminDriver(payload.new);
            if (isArchivedDriver(newDriver) || isSoftDeletedRecord(payload.new)) return;
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
            const updatedDriver = mapDbDriverToAdminDriver(payload.new);
            if (isArchivedDriver(updatedDriver) || isSoftDeletedRecord(payload.new)) {
              setDrivers((prev) => prev.filter(d => !sameDriverRecord(d, updatedDriver)));
              setArchivedDrivers((prev) => {
                if (prev.some(d => sameDriverRecord(d, updatedDriver))) return prev;
                const next = [{ ...updatedDriver, status: "Archived" as DriverStatus }, ...prev];
                saveArchivedDrivers(next);
                return next;
              });
              return;
            }
            setArchivedDrivers((prev) => {
              const next = prev.filter(d => !sameDriverRecord(d, updatedDriver));
              if (next.length !== prev.length) saveArchivedDrivers(next);
              return next;
            });
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
            if (isSoftDeletedRecord(payload.new)) return;
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
            if (isSoftDeletedRecord(payload.new)) {
              setBookings((prev) => prev.filter(b => b.id !== payload.new.id));
              return;
            }
            const updatedBooking = mapRowToBooking(payload.new);
            setBookings((prev) => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
            flashRow(updatedBooking.id, "success");
          } else if (payload.eventType === "DELETE") {
            setBookings((prev) => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const unsubscribeRatings = subscribeToRatings(() => {
      void loadDrivers();
    });

    return () => {
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(bookingsChannel);
      unsubscribeRatings();
    };
  }, []);

  // ─── Driver actions ───────────────────────────────────────────────────────

  /**
   * Update a locally-registered driver's status in localStorage + local state.
   * Used when the driver ID is not a Supabase UUID (e.g. "driver_09321312313").
   */
  function updateDriverState(
    id: string,
    approvalStatus: "approved" | "rejected",
    newStatus: DriverStatus,
    newLicense: LicenseStatus,
  ) {
    const driver = drivers.find(d => d.id === id) || { id };
    const matchedLocal = findMatchingLocalDriver(driver);

    if (matchedLocal) {
      updateUser(matchedLocal.username, {
        approvalStatus,
        role: "driver",
        ...(isUUID(id) ? { supabaseId: id } : {}),
      });
    } else if (!isUUID(id)) {
      updateUser(id, { approvalStatus, role: "driver" });
    }

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
    if (!validateDriverAction(id, "approve")) return;

    if (!isUUID(id)) {
      updateDriverState(id, "approved", "Active", "Approved");
      await syncLocalDriverApprovalToSupabase(id, "approved");
      toast.success("Driver approved successfully");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const approval = await approveDriverApplicationInSupabase(id);
    if (!approval.ok) {
      toast.error("Failed to approve driver", { description: approval.error });
    } else {
      updateDriverState(id, "approved", "Active", "Approved");
      toast.success("Driver approved successfully");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rejectDriver = useCallback(async (id: string) => {
    if (!validateDriverAction(id, "reject")) return;

    if (!isUUID(id)) {
      updateDriverState(id, "rejected", "Blocked", "Blocked");
      await syncLocalDriverApprovalToSupabase(id, "rejected");
      toast.success("Driver application rejected");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase
      .from("drivers")
      .update({ approval_status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to reject driver", { description: error.message });
    } else {
      await supabase.from("profiles").update({ approval_status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
      updateDriverState(id, "rejected", "Blocked", "Blocked");
      toast.success("Driver application rejected");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockDriver = useCallback(async (id: string) => {
    if (!validateDriverAction(id, "block")) return;

    if (!isUUID(id)) {
      updateDriverState(id, "rejected", "Blocked", "Blocked");
      await syncLocalDriverApprovalToSupabase(id, "rejected");
      toast.warning("Driver blocked successfully");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const { error } = await supabase
      .from("drivers")
      .update({ account_status: "Blocked", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to block driver", { description: error.message });
    } else {
      await supabase.from("profiles").update({ approval_status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
      updateDriverState(id, "rejected", "Blocked", "Blocked");
      toast.warning("Driver blocked successfully");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reinstateDriver = useCallback(async (id: string) => {
    if (!validateDriverAction(id, "reinstate")) return;

    if (!isUUID(id)) {
      updateDriverState(id, "approved", "Active", "Approved");
      await syncLocalDriverApprovalToSupabase(id, "approved");
      toast.success("Driver reinstated successfully");
      return;
    }
    if (!supabase) { toast.error("Supabase not configured."); return; }
    const approval = await approveDriverApplicationInSupabase(id);
    if (!approval.ok) {
      toast.error("Failed to reinstate driver", { description: approval.error });
    } else {
      updateDriverState(id, "approved", "Active", "Approved");
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
      const matchedLocal = findMatchingLocalDriver(d);
      updateUser(matchedLocal?.username || d.id, { approvalStatus: "approved", role: "driver" });
      await syncLocalDriverApprovalToSupabase(matchedLocal?.username || d.id, "approved");
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
      let failedApproval: string | null = null;
      for (const d of supabasePending) {
        const approval = await approveDriverApplicationInSupabase(d.id);
        if (!approval.ok) {
          failedApproval = approval.error || "Unknown approval error.";
          break;
        }
      }
      if (failedApproval) {
        toast.error("Failed to approve some drivers", { description: failedApproval });
        return;
      }
      setDrivers(prev =>
        prev.map(d =>
          supabasePending.some(sd => sd.id === d.id)
            ? { ...d, status: "Active" as DriverStatus, license: "Approved" as LicenseStatus }
            : d
        )
      );
    }

    toast.success(`Approved ${pendingDrivers.length} driver${pendingDrivers.length > 1 ? "s" : ""}`);
  }, [drivers]);

  // ─── Archive actions ──────────────────────────────────────────────────────
  const archiveDriver = useCallback(async (id: string) => {
    // Find the driver in active list
    const driver = validateDriverAction(id, "archive");
    if (!driver) return;

    const archived: Driver = { ...driver, status: "Archived" as DriverStatus };
    const updated = [
      archived,
      ...archivedDrivers.filter(d => !sameDriverRecord(d, archived)),
    ];
    setArchivedDrivers(updated);
    saveArchivedDrivers(updated);

    // Remove from active drivers
    setDrivers(prev => prev.filter(d => !sameDriverRecord(d, archived)));

    const matchedLocal = findMatchingLocalDriver(driver);
    const deletedAt = new Date().toISOString();
    if (matchedLocal) {
      updateUser(matchedLocal.username, {
        approvalStatus: "rejected",
        role: "driver",
        accountStatus: "Archived",
        isDeleted: true,
        deletedAt,
        deletedBy: "admin",
      });
    }

    // Update localStorage for local-only drivers
    if (!isUUID(id)) {
      updateUser(id, {
        approvalStatus: "rejected",
        role: "driver",
        accountStatus: "Archived",
        isDeleted: true,
        deletedAt,
        deletedBy: "admin",
      });
    } else if (supabase) {
      const driverResult = await softDeleteSupabaseRecord("drivers", id, {
        approval_status: "rejected",
        account_status: "Archived",
      });
      const profileResult = await softDeleteSupabaseRecord("profiles", id, {
        approval_status: "rejected",
        account_status: "Archived",
      });
      if (!driverResult.success || !profileResult.success) {
        toast.error("Driver archived locally, but Supabase soft-delete failed.", {
          description: driverResult.error || profileResult.error,
        });
      }
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
    const driver = validateDriverAction(id, "restore", archivedDrivers);
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
      restoreUser(id);
      const matchedLocal = findMatchingLocalDriver(driver, getAllUsersIncludingDeleted());
      if (matchedLocal) {
        restoreUser(matchedLocal.username);
        updateUser(matchedLocal.username, { approvalStatus: "approved", accountStatus: "Active" });
      } else {
        updateUser(id, { approvalStatus: "approved", accountStatus: "Active" });
      }
    } else if (supabase) {
      const driverResult = await restoreSupabaseRecord("drivers", id, {
        approval_status: "approved",
        account_status: "Active",
      });
      const profileResult = await restoreSupabaseRecord("profiles", id, {
        approval_status: "approved",
        account_status: "Active",
      });
      if (!driverResult.success || !profileResult.success) {
        toast.error("Driver restored locally, but Supabase recovery failed.", {
          description: driverResult.error || profileResult.error,
        });
      } else {
        await syncDriverToProfile(id);
      }
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

    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const transition = validateBookingStatusTransition(booking.status, "Cancelled");
    if (!transition.valid) {
      toast.error("Invalid booking status change", { description: transition.message });
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      toast.error("Failed to cancel booking", { description: error.message });
    } else {
      toast.success("Booking cancelled successfully");
    }
  }, [bookings]);

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
