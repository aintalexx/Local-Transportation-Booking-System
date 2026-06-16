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
  rideType?: "solo" | "shared";
  status: "pending" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  discount?: {
    type: string;
    amount: number;
  };
}

const BOOKINGS_KEY = "ridestamesa_bookings";

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
    ["pending", "accepted", "en_route", "arrived", "in_progress"].includes(b.status)
  ) || null;
}

// Get driver's active booking
export function getDriverActiveBooking(username: string): BookingData | null {
  const bookings = getAllBookings();
  return bookings.find(
    b => b.driverUsername === username &&
    ["accepted", "en_route", "arrived", "in_progress"].includes(b.status)
  ) || null;
}

// Get all pending bookings (for drivers to see)
export function getPendingBookings(vehicleType?: string): BookingData[] {
  const bookings = getAllBookings();
  return bookings.filter(b => {
    const isPending = b.status === "pending";
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

    if (bookings[bookingIndex].status !== "pending") {
      console.error("Booking is not pending:", bookingId);
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
export function updateBookingStatus(bookingId: string, status: BookingData["status"]): boolean {
  try {
    const bookings = getAllBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      console.error("Booking not found:", bookingId);
      return false;
    }

    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      status,
      ...(status === "completed" && { completedAt: new Date().toISOString() }),
    };

    saveAllBookings(bookings);
    console.log("Booking status updated:", bookingId, status);
    return true;
  } catch (error) {
    console.error("Error updating booking status:", error);
    return false;
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
export function cancelBooking(bookingId: string): boolean {
  return updateBookingStatus(bookingId, "cancelled");
}

// Get passenger's booking history
export function getPassengerBookingHistory(username: string): BookingData[] {
  const bookings = getAllBookings();
  return bookings.filter(b => b.passengerUsername === username).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get driver's booking history
export function getDriverBookingHistory(username: string): BookingData[] {
  const bookings = getAllBookings();
  return bookings.filter(b => b.driverUsername === username).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Get booking statistics
export function getBookingStats() {
  const bookings = getAllBookings();
  return {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    active: bookings.filter(b => ["accepted", "en_route", "arrived", "in_progress"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };
}
