import { validatePositiveMoney } from "./validators";

// Booking Database using localStorage
// This stores all bookings and handles booking lifecycle

export interface BookingData {
  id: string;
  passengerUsername: string;
  passengerName: string;
  passengerPhone: string;
  driverUsername?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicleType?: string;
  driverPlateNumber?: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  currentDriverLocation?: {
    lat: number;
    lng: number;
  };
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
  status: BookingStatus;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  discount?: {
    type: string;
    amount: number;
  };
}

export type BookingStatus =
  | "idle"
  | "selecting_location"
  | "route_preview"
  | "finding_driver"
  | "searching"
  | "available"
  | "driver_found"
  | "driver_arriving"
  | "driver_to_pickup"
  | "passenger_picked_up"
  | "driver_arrived"
  | "ride_started"
  | "ride_ongoing"
  | "ride_completed"
  | "pending"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

const BOOKINGS_KEY = "ridestamesa_bookings";
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "finding_driver",
  "accepted",
  "driver_found",
  "driver_arriving",
  "en_route",
  "driver_to_pickup",
  "passenger_picked_up",
  "arrived",
  "driver_arrived",
  "ride_started",
  "in_progress",
  "ride_ongoing",
];

// Get all bookings from database
export function getAllBookings(): BookingData[] {
  try {
    const bookingsJson = localStorage.getItem(BOOKINGS_KEY);
    if (!bookingsJson) return [];
    return JSON.parse(bookingsJson);
  } catch (error) {
    console.error("Error reading bookings database:", error);
    return [];
  }
}

// Save all bookings to database
function saveAllBookings(bookings: BookingData[]): void {
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    console.log(`Saved ${bookings.length} bookings to database`);
  } catch (error) {
    console.error("Error saving bookings database:", error);
  }
}

export function upsertBooking(bookingData: BookingData): BookingData {
  const bookings = getAllBookings();
  const bookingIndex = bookings.findIndex(b => b.id === bookingData.id);
  const nextBooking = {
    ...bookingData,
    ...((bookingData.status === "completed" || bookingData.status === "ride_completed") && {
      completedAt: bookingData.completedAt || new Date().toISOString(),
    }),
  };

  if (bookingIndex === -1) {
    bookings.push(nextBooking);
  } else {
    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      ...nextBooking,
    };
  }

  saveAllBookings(bookings);
  return nextBooking;
}

// Create a new booking
export function createBooking(bookingData: Omit<BookingData, "id" | "createdAt" | "status">): BookingData {
  const basePriceCheck = validatePositiveMoney(bookingData.basePrice, "Base price");
  const finalPriceCheck = validatePositiveMoney(bookingData.finalPrice, "Final price");

  if (!basePriceCheck.valid) {
    throw new Error(basePriceCheck.message);
  }

  if (!finalPriceCheck.valid) {
    throw new Error(finalPriceCheck.message);
  }

  if (!Number.isFinite(bookingData.distance) || bookingData.distance <= 0 || bookingData.distance > 500) {
    throw new Error("Distance must be greater than 0 and realistic.");
  }

  const bookings = getAllBookings();

  const newBooking: BookingData = {
    ...bookingData,
    id: `BK${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  bookings.push(newBooking);
  saveAllBookings(bookings);

  console.log("Booking created:", newBooking.id);
  return newBooking;
}

// Get booking by ID
export function getBooking(bookingId: string): BookingData | null {
  const bookings = getAllBookings();
  return bookings.find(b => b.id === bookingId) || null;
}

// Get passenger's active booking
export function getPassengerActiveBooking(username: string): BookingData | null {
  const bookings = getAllBookings();
  return bookings.find(
    b => b.passengerUsername === username &&
    ACTIVE_BOOKING_STATUSES.includes(b.status)
  ) || null;
}

// Get driver's active booking
export function getDriverActiveBooking(username: string): BookingData | null {
  const bookings = getAllBookings();
  return bookings.find(
    b => b.driverUsername === username &&
    ["accepted", "driver_found", "en_route", "driver_to_pickup", "arrived", "driver_arrived", "ride_started", "in_progress", "ride_ongoing"].includes(b.status)
  ) || null;
}

// Get all pending bookings (for drivers to see)
export function getPendingBookings(vehicleType?: string): BookingData[] {
  const bookings = getAllBookings();
  return bookings.filter(b => {
    const isPending = b.status === "pending" || b.status === "finding_driver";
    if (vehicleType) {
      return isPending && b.vehicleType.toLowerCase() === vehicleType.toLowerCase();
    }
    return isPending;
  });
}

// Accept a booking (driver accepts)
export function acceptBooking(bookingId: string, driverUsername: string, driverName: string, driverPhone: string, driverVehicleType: string, driverPlateNumber: string): boolean {
  try {
    const bookings = getAllBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      console.error("Booking not found:", bookingId);
      return false;
    }

    if (!["pending", "finding_driver"].includes(bookings[bookingIndex].status)) {
      console.error("Booking is not waiting for a driver:", bookingId);
      return false;
    }

    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      driverUsername,
      driverName,
      driverPhone,
      driverVehicleType,
      driverPlateNumber,
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    };

    saveAllBookings(bookings);
    console.log("Booking accepted:", bookingId);
    return true;
  } catch (error) {
    console.error("Error accepting booking:", error);
    return false;
  }
}

// Update booking status
export function updateBookingStatus(bookingId: string, status: BookingData["status"], updates: Partial<BookingData> = {}): boolean {
  try {
    const bookings = getAllBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      console.error("Booking not found:", bookingId);
      return false;
    }

    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      ...updates,
      status,
      ...((status === "completed" || status === "ride_completed") && { completedAt: new Date().toISOString() }),
      ...(status === "cancelled" && { cancelledAt: new Date().toISOString() }),
    };

    saveAllBookings(bookings);
    console.log("Booking status updated:", bookingId, status);
    return true;
  } catch (error) {
    console.error("Error updating booking status:", error);
    return false;
  }
}

// Update any booking fields used by the demo booking algorithm.
export function updateBooking(bookingId: string, updates: Partial<BookingData>): BookingData | null {
  try {
    const bookings = getAllBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      console.error("Booking not found:", bookingId);
      return null;
    }

    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      ...updates,
      ...((updates.status === "completed" || updates.status === "ride_completed") && { completedAt: new Date().toISOString() }),
    };

    saveAllBookings(bookings);
    return bookings[bookingIndex];
  } catch (error) {
    console.error("Error updating booking:", error);
    return null;
  }
}

// Update driver's current location
export function updateDriverLocation(bookingId: string, lat: number, lng: number): boolean {
  try {
    const bookings = getAllBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      console.error("Booking not found:", bookingId);
      return false;
    }

    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      currentDriverLocation: { lat, lng },
    };

    saveAllBookings(bookings);
    return true;
  } catch (error) {
    console.error("Error updating driver location:", error);
    return false;
  }
}

// Cancel a booking
export function cancelBooking(bookingId: string, reason = ""): boolean {
  const trimmedReason = reason.trim();
  return updateBookingStatus(bookingId, "cancelled", {
    ...(trimmedReason ? { cancellationReason: trimmedReason } : {}),
  });
}

// Get passenger's booking history
export function getPassengerBookingHistory(username: string, alternateId?: string): BookingData[] {
  const bookings = getAllBookings();
  return bookings
    .filter(b => b.passengerUsername === username || (!!alternateId && b.passengerUsername === alternateId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get driver's booking history
export function getDriverBookingHistory(username: string, alternateId?: string): BookingData[] {
  const bookings = getAllBookings();
  return bookings
    .filter(b => b.driverUsername === username || (!!alternateId && b.driverUsername === alternateId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get booking statistics
export function getBookingStats() {
  const bookings = getAllBookings();
  return {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending" || b.status === "finding_driver").length,
    active: bookings.filter(b => ACTIVE_BOOKING_STATUSES.includes(b.status)).length,
    completed: bookings.filter(b => b.status === "completed" || b.status === "ride_completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };
}
