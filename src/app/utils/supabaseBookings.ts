import { supabase } from "../lib/supabase";
import type { BookingData } from "./bookingDatabase";
import { formatPersonName } from "./nameFormatting";
import { getCurrentSupabaseUserId, syncSupabaseProfile } from "./supabaseProfiles";
import type { UserData } from "./userDatabase";

type BookingStatus = BookingData["status"];
type DriverDashboardStatus = BookingStatus | "rejected";
const AVAILABLE_BOOKING_STATUSES: BookingStatus[] = ["pending", "searching", "available"];
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "searching",
  "available",
  "accepted",
  "driver_arriving",
  "en_route",
  "passenger_picked_up",
  "arrived",
  "in_progress",
];
const DRIVER_ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "accepted",
  "driver_arriving",
  "en_route",
  "passenger_picked_up",
  "arrived",
  "in_progress",
];

type SupabaseBookingRow = {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  passenger_name: string;
  passenger_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle_type: string | null;
  driver_plate_number: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  distance_km: number | string;
  base_price: number | string;
  final_price: number | string;
  payment_method: string;
  vehicle_type: string;
  ride_type: "solo" | "group" | "shared" | null;
  passenger_count?: number | null;
  reserve_entire?: boolean | null;
  booking_type?: "solo" | "group" | null;
  total_fare?: number | string | null;
  individual_share?: number | string | null;
  split_payment_enabled?: boolean | null;
  status: BookingStatus;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
};

export type DriverDashboardSummary = {
  totalEarningsToday: number;
  todaysRides: number;
  completedRides: number;
  cancelledRejectedRides: number;
  ongoingRides: number;
  recentRideHistory: BookingData[];
};

export type CreateSupabaseBookingInput = {
  passenger: UserData;
  pickupLocation: BookingData["pickupLocation"];
  destination: BookingData["destination"];
  distance: number;
  basePrice: number;
  finalPrice: number;
  paymentMethod: string;
  vehicleType: string;
  rideType?: "solo" | "group" | "shared";
  passengerCount?: number;
  reserveEntire?: boolean;
  bookingType?: "solo" | "group";
  totalFare?: number;
  individualShare?: number;
  splitPaymentEnabled?: boolean;
};

export async function createSupabaseBooking(input: CreateSupabaseBookingInput): Promise<BookingData | null> {
  if (!supabase) return null;

  const userId = input.passenger.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return null;

  await syncSupabaseProfile(input.passenger);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      passenger_id: userId,
      passenger_name: formatPersonName(input.passenger, input.passenger.username),
      passenger_phone: input.passenger.phoneNumber || null,
      pickup_lat: input.pickupLocation.lat,
      pickup_lng: input.pickupLocation.lng,
      pickup_address: input.pickupLocation.address,
      destination_lat: input.destination.lat,
      destination_lng: input.destination.lng,
      destination_address: input.destination.address,
      distance_km: input.distance,
      base_price: input.basePrice,
      final_price: input.finalPrice,
      payment_method: input.paymentMethod,
      vehicle_type: input.vehicleType,
      ride_type: input.rideType || input.bookingType || "solo",
      passenger_count: input.passengerCount || 1,
      reserve_entire: input.reserveEntire || false,
      booking_type: input.bookingType || "solo",
      total_fare: input.totalFare ?? input.finalPrice,
      individual_share: input.individualShare ?? input.finalPrice,
      split_payment_enabled: input.splitPaymentEnabled || false,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.info("Supabase booking insert failed:", error.message);
    return null;
  }

  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export async function getSupabaseBooking(bookingId: string): Promise<BookingData | null> {
  if (!supabase || !isUuid(bookingId)) return null;

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export async function getSupabasePassengerActiveBooking(user: UserData): Promise<BookingData | null> {
  if (!supabase) return null;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("passenger_id", userId)
    .in("status", ACTIVE_BOOKING_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export async function getSupabaseDriverActiveBooking(user: UserData): Promise<BookingData | null> {
  if (!supabase) return null;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return getActiveBookingForDriver(user);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("driver_id", userId)
    .in("status", DRIVER_ACTIVE_BOOKING_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return getActiveBookingForDriver(user);
  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export async function getSupabasePendingBookings(vehicleType?: string, driver?: UserData): Promise<BookingData[]> {
  if (!supabase) return [];

  let query = supabase
    .from("bookings")
    .select("*")
    .in("status", AVAILABLE_BOOKING_STATUSES)
    .is("driver_id", null)
    .order("created_at", { ascending: true });

  if (vehicleType) {
    query = query.ilike("vehicle_type", vehicleType);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    if (driver?.phoneNumber) {
      const rpcBookings = await getAvailableBookingsForDriver(driver, vehicleType);
      if (rpcBookings.length > 0) return rpcBookings;
    }

    if (error || !data) return [];
  }

  return (data as SupabaseBookingRow[]).map(mapSupabaseBooking);
}

export async function getSupabasePendingBookingsResult(vehicleType?: string): Promise<{
  bookings: BookingData[];
  error: string | null;
}> {
  if (!supabase) {
    return { bookings: [], error: "Supabase is not configured." };
  }

  let query = supabase
    .from("bookings")
    .select("*")
    .in("status", AVAILABLE_BOOKING_STATUSES)
    .is("driver_id", null)
    .order("created_at", { ascending: true });

  if (vehicleType) {
    query = query.ilike("vehicle_type", vehicleType);
  }

  const { data, error } = await query;
  if (error) {
    return { bookings: [], error: error.message };
  }

  return {
    bookings: (data as SupabaseBookingRow[] | null || []).map(mapSupabaseBooking),
    error: null,
  };
}

export async function getSupabasePendingBookingsForDriverResult(
  driver: UserData,
  vehicleType?: string
): Promise<{
  bookings: BookingData[];
  error: string | null;
}> {
  const directResult = await getSupabasePendingBookingsResult(vehicleType);
  if (directResult.error === null && directResult.bookings.length > 0) {
    return directResult;
  }

  const rpcBookings = await getAvailableBookingsForDriver(driver, vehicleType);
  if (rpcBookings.length > 0) {
    return { bookings: rpcBookings, error: null };
  }

  return directResult;
}

export function subscribeToSupabasePendingBookings(
  onChange: () => void
): () => void {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`driver-pending-bookings-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function getSupabasePassengerBookingHistory(user: UserData): Promise<BookingData[]> {
  if (!supabase) return [];

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("passenger_id", userId)
    .in("status", ["completed", "ride_completed", "cancelled"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as SupabaseBookingRow[]).map(mapSupabaseBooking);
}

export async function getSupabaseDriverBookingHistory(user: UserData): Promise<BookingData[]> {
  if (!supabase) return [];

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) return getDriverBookingsForHistory(user, ["completed", "ride_completed", "cancelled"]);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("driver_id", userId)
    .in("status", ["completed", "ride_completed", "cancelled"])
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return getDriverBookingsForHistory(user, ["completed", "ride_completed", "cancelled"]);
  }

  return (data as SupabaseBookingRow[]).map(mapSupabaseBooking);
}

export async function getSupabaseDriverDashboardSummary(user: UserData): Promise<DriverDashboardSummary> {
  const emptySummary: DriverDashboardSummary = {
    totalEarningsToday: 0,
    todaysRides: 0,
    completedRides: 0,
    cancelledRejectedRides: 0,
    ongoingRides: 0,
    recentRideHistory: [],
  };

  if (!supabase) return emptySummary;

  const userId = user.supabaseId || await getCurrentSupabaseUserId();
  if (!userId) {
    const credentialRides = await getDriverBookingsForHistory(user);
    return buildDriverDashboardSummary(credentialRides);
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("driver_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data || data.length === 0) {
    const credentialRides = await getDriverBookingsForHistory(user);
    return buildDriverDashboardSummary(credentialRides);
  }

  const rides = (data as SupabaseBookingRow[]).map(mapSupabaseBooking);
  return buildDriverDashboardSummary(rides);
}

function buildDriverDashboardSummary(rides: BookingData[]): DriverDashboardSummary {
  const todayRides = rides.filter(isCreatedOrCompletedToday);
  const completedToday = todayRides.filter(isCompletedRide);
  const cancelledRejectedToday = todayRides.filter(isCancelledOrRejectedRide);
  const ongoingToday = todayRides.filter(isOngoingRide);
  const recentRideHistory = rides
    .filter((ride) => isCompletedRide(ride) || isCancelledOrRejectedRide(ride))
    .sort((a, b) => getRideActivityTime(b) - getRideActivityTime(a))
    .slice(0, 5);

  return {
    totalEarningsToday: completedToday.reduce((sum, ride) => sum + (ride.totalFare ?? ride.finalPrice), 0),
    todaysRides: todayRides.length,
    completedRides: completedToday.length,
    cancelledRejectedRides: cancelledRejectedToday.length,
    ongoingRides: ongoingToday.length,
    recentRideHistory,
  };
}

export async function acceptSupabaseBooking(bookingId: string, driver: UserData): Promise<BookingData | null> {
  if (!supabase || !isUuid(bookingId)) return null;

  const authUserId = await getCurrentSupabaseUserId();
  const userId = authUserId || driver.supabaseId;
  if (!userId) return null;

  await syncSupabaseProfile(driver);

  const driverName = formatPersonName(driver, driver.username);
  const { data, error } = await supabase
    .from("bookings")
    .update({
      driver_id: userId,
      driver_name: driverName,
      driver_phone: driver.phoneNumber || null,
      driver_vehicle_type: driver.vehicleType || "Tricycle",
      driver_plate_number: driver.plateNumber || null,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .in("status", AVAILABLE_BOOKING_STATUSES)
    .is("driver_id", null)
    .select()
    .single();

  if (error || !data) {
    const fallbackBooking = await acceptBookingWithDriverCredentials(bookingId, driver);
    if (fallbackBooking) return fallbackBooking;
    return null;
  }

  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export async function updateSupabaseBookingStatus(bookingId: string, status: BookingStatus): Promise<BookingData | null> {
  if (!supabase || !isUuid(bookingId)) return null;

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status,
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error || !data) return null;
  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export async function updateSupabaseDriverBookingStatus(
  bookingId: string,
  status: BookingStatus,
  driver: UserData
): Promise<BookingData | null> {
  const directUpdate = await updateSupabaseBookingStatus(bookingId, status);
  if (directUpdate) return directUpdate;

  if (!supabase || !isUuid(bookingId) || !driver.phoneNumber) return null;

  const { data, error } = await supabase.rpc("update_booking_status_as_driver", {
    p_booking_id: bookingId,
    p_driver_phone: driver.phoneNumber,
    p_driver_password: driver.password || "",
    p_status: status,
  });

  if (error || !data) return null;
  return mapSupabaseBooking(data as SupabaseBookingRow);
}

export function subscribeToSupabaseBooking(
  bookingId: string,
  onBooking: (booking: BookingData) => void
): () => void {
  if (!supabase || !isUuid(bookingId)) return () => undefined;

  const channel = supabase
    .channel(`booking:${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        const row = payload.new as SupabaseBookingRow | null;
        if (row) onBooking(mapSupabaseBooking(row));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

function mapSupabaseBooking(row: SupabaseBookingRow): BookingData {
  return {
    id: row.id,
    passengerUsername: row.passenger_id,
    passengerName: row.passenger_name,
    passengerPhone: row.passenger_phone || "",
    driverUsername: row.driver_id || undefined,
    driverName: row.driver_name || undefined,
    driverPhone: row.driver_phone || undefined,
    driverVehicleType: row.driver_vehicle_type || undefined,
    driverPlateNumber: row.driver_plate_number || undefined,
    pickupLocation: {
      lat: row.pickup_lat,
      lng: row.pickup_lng,
      address: row.pickup_address,
    },
    destination: {
      lat: row.destination_lat,
      lng: row.destination_lng,
      address: row.destination_address,
    },
    distance: Number(row.distance_km),
    basePrice: Number(row.base_price),
    finalPrice: Number(row.final_price),
    paymentMethod: row.payment_method,
    vehicleType: row.vehicle_type,
    rideType: row.ride_type || undefined,
    passengerCount: row.passenger_count || undefined,
    reserveEntire: row.reserve_entire || undefined,
    bookingType: row.booking_type || undefined,
    totalFare: row.total_fare ? Number(row.total_fare) : undefined,
    individualShare: row.individual_share ? Number(row.individual_share) : undefined,
    splitPaymentEnabled: row.split_payment_enabled || undefined,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || undefined,
    completedAt: row.completed_at || undefined,
  };
}

function isCreatedOrCompletedToday(ride: BookingData): boolean {
  return isToday(ride.createdAt) || Boolean(ride.completedAt && isToday(ride.completedAt));
}

function isCompletedRide(ride: BookingData): boolean {
  return ride.status === "completed" || ride.status === "ride_completed";
}

function isCancelledOrRejectedRide(ride: BookingData): boolean {
  const status = ride.status as DriverDashboardStatus;
  return status === "cancelled" || status === "rejected";
}

function isOngoingRide(ride: BookingData): boolean {
  return DRIVER_ACTIVE_BOOKING_STATUSES.includes(ride.status);
}

function isToday(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getRideActivityTime(ride: BookingData): number {
  const value = new Date(ride.completedAt || ride.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getAvailableBookingsForDriver(driver: UserData, vehicleType?: string): Promise<BookingData[]> {
  if (!supabase || !driver.phoneNumber) return [];

  const { data, error } = await supabase.rpc("get_available_bookings_for_driver", {
    p_driver_phone: driver.phoneNumber,
    p_driver_password: driver.password || "",
    p_vehicle_type: vehicleType || driver.vehicleType || "Tricycle",
  });

  if (error || !data) return [];
  return (data as SupabaseBookingRow[]).map(mapSupabaseBooking);
}

async function acceptBookingWithDriverCredentials(bookingId: string, driver: UserData): Promise<BookingData | null> {
  if (!supabase || !driver.phoneNumber) return null;

  const { data, error } = await supabase.rpc("accept_booking_as_driver", {
    p_booking_id: bookingId,
    p_driver_phone: driver.phoneNumber,
    p_driver_password: driver.password || "",
  });

  if (error || !data) return null;

  return mapSupabaseBooking(data as SupabaseBookingRow);
}

async function getActiveBookingForDriver(driver: UserData): Promise<BookingData | null> {
  if (!supabase || !driver.phoneNumber) return null;

  const { data, error } = await supabase.rpc("get_active_booking_for_driver", {
    p_driver_phone: driver.phoneNumber,
    p_driver_password: driver.password || "",
  });

  if (error || !data) return null;

  return mapSupabaseBooking(data as SupabaseBookingRow);
}

async function getDriverBookingsForHistory(
  driver: UserData,
  statuses?: BookingStatus[],
): Promise<BookingData[]> {
  if (!supabase || !driver.phoneNumber) return [];

  const { data, error } = await supabase.rpc("get_driver_bookings_for_history", {
    p_driver_phone: driver.phoneNumber,
    p_driver_password: driver.password || "",
  });

  if (error || !data) return [];

  const rides = (data as SupabaseBookingRow[]).map(mapSupabaseBooking);
  if (!statuses) return rides;
  return rides.filter((ride) => statuses.includes(ride.status));
}
