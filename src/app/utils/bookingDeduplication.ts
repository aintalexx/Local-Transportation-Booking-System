/**
 * Unified booking deduplication logic
 * Prevents duplicate bookings from appearing when data comes from both local and Supabase
 */

import type { BookingData } from "./bookingDatabase";

export function getBookingCreatedTime(booking: BookingData | any): number {
  const value = new Date(booking.createdAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function getPassengerRequestKey(booking: BookingData | any): string {
  // Try to use passenger username first (most reliable)
  const username = String(booking.passengerUsername || "").trim().toLowerCase();
  if (username) return `username:${username}`;

  // Fall back to name if available
  const name = String(booking.passengerName || "").trim().toLowerCase();
  if (name) return `name:${name}`;

  // Fall back to phone number
  const phone = String(booking.passengerPhone || "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;

  // Last resort: use booking ID
  return `booking:${booking.id}`;
}

/**
 * Deduplicates bookings from multiple sources (local storage + Supabase)
 * Keeps the latest booking for each passenger and prefers Supabase data
 *
 * @param bookings Array of bookings from both local and Supabase
 * @returns Deduplicated bookings sorted by creation time (newest first)
 */
export function dedupePendingBookings(bookings: (BookingData | any)[]): (BookingData | any)[] {
  if (!bookings || bookings.length === 0) return [];

  const latestByPassenger = new Map<string, BookingData | any>();

  // Sort by creation time (newest first) to identify latest bookings
  const sorted = [...bookings].sort((a, b) => getBookingCreatedTime(b) - getBookingCreatedTime(a));

  sorted.forEach((booking) => {
    const key = getPassengerRequestKey(booking);
    const existing = latestByPassenger.get(key);

    if (!existing) {
      // First time seeing this passenger, store the booking
      latestByPassenger.set(key, booking);
      return;
    }

    // Decide which booking to keep based on source
    const bookingLooksSupabase = booking.id.includes("-"); // Supabase IDs have dashes
    const existingLooksLocal = !existing.id.includes("-");

    // Prefer Supabase booking over local booking
    if (bookingLooksSupabase && existingLooksLocal) {
      latestByPassenger.set(key, booking);
    }
    // Otherwise keep the first one (which is the newest due to sorting)
  });

  // Return final list sorted by creation time
  return Array.from(latestByPassenger.values()).sort((a, b) => getBookingCreatedTime(b) - getBookingCreatedTime(a));
}
