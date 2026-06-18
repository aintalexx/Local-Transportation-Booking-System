// ─── City of Manila Tri-Wheel Fare Matrix ─────────────────────────────────────
// Ordinance No. 8979, Series of 2022
// Tricycle & Pedicab:
//   ₱16.00 — First 1 km
//   +₱5.00  — Every succeeding 500 m (0.5 km)
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_FARE       = 16;   // ₱16.00 for the first 1 km
export const BASE_DISTANCE   = 1;    // km
export const SUCC_FARE       = 5;    // ₱5.00 per succeeding unit
export const SUCC_DISTANCE   = 0.5;  // 500 m expressed in km

// Keep legacy names so existing imports don't break
export const DEMO_BASE_FARE    = BASE_FARE;
export const DEMO_PER_KM_RATE  = SUCC_FARE / SUCC_DISTANCE; // ₱10/km equivalent (informational)

export type FareEstimate = {
  baseFare: number;
  perKmRate: number;
  distanceKm: number;
  subtotal: number;
  finalFare: number;
};

/**
 * Calculates the tricycle fare per the City of Manila Standard Fare Matrix.
 *
 * Formula:
 *   - 0 – 1 km  → ₱16.00 (flat)
 *   - > 1 km    → ₱16.00 + ceil((distance - 1) / 0.5) × ₱5.00
 *
 * Examples:
 *   0.8 km  → ₱16
 *   1.5 km  → ₱21
 *   2.0 km  → ₱26
 *   2.5 km  → ₱31
 *   3.0 km  → ₱36
 */
export function calculateFare(distanceKm: number): FareEstimate {
  const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;

  let subtotal: number;
  if (safeDistance <= BASE_DISTANCE) {
    subtotal = BASE_FARE;
  } else {
    const extra = safeDistance - BASE_DISTANCE;
    const succUnits = Math.ceil(extra / SUCC_DISTANCE);
    subtotal = BASE_FARE + succUnits * SUCC_FARE;
  }

  return {
    baseFare: BASE_FARE,
    perKmRate: SUCC_FARE / SUCC_DISTANCE,
    distanceKm: Math.round(safeDistance * 10) / 10,
    subtotal,
    finalFare: subtotal,
  };
}

// Backward-compatible alias used by BookingPage and other pages
export const calculateDemoFare = calculateFare;

export function applyRideDiscounts(
  fare: number,
  options: {
    rideType: "solo" | "shared";
    passengerType: "regular" | "student" | "pwd";
    promoDiscount?: number;
  }
): number {
  let total = fare;

  if (options.rideType === "shared") total *= 0.7;
  if (options.promoDiscount) total *= 1 - options.promoDiscount / 100;

  return Math.max(1, Math.round(total));
}

