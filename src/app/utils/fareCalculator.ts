// City of Manila Tri-Wheel Fare Matrix
// Ordinance No. 8979, Series of 2022
// Tricycle and pedicab:
//   PHP 16.00 - First 1 km
//   +PHP 5.00 - Every succeeding 500 m (0.5 km)
export const BASE_FARE = 16;
export const BASE_DISTANCE = 1; // km
export const SUCC_FARE = 5;
export const SUCC_DISTANCE = 0.5; // 500 m expressed in km

// Keep legacy names so existing imports do not break.
export const DEMO_BASE_FARE = BASE_FARE;
export const DEMO_PER_KM_RATE = SUCC_FARE / SUCC_DISTANCE;

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
 * - 0 to 1 km: PHP 16.00 flat
 * - Above 1 km: PHP 16.00 + ceil((distance - 1) / 0.5) * PHP 5.00
 *
 * Examples:
 * - 0.8 km: PHP 16
 * - 1.5 km: PHP 21
 * - 2.0 km: PHP 26
 * - 2.5 km: PHP 31
 * - 3.0 km: PHP 36
 */
export function calculateFare(distanceKm: number): FareEstimate {
  const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;
  const succeedingUnits =
    safeDistance > BASE_DISTANCE
      ? Math.ceil((safeDistance - BASE_DISTANCE) / SUCC_DISTANCE)
      : 0;
  const subtotal = BASE_FARE + succeedingUnits * SUCC_FARE;

  return {
    baseFare: BASE_FARE,
    perKmRate: DEMO_PER_KM_RATE,
    distanceKm: Math.round(safeDistance * 10) / 10,
    subtotal,
    finalFare: subtotal,
  };
}

export const calculateDemoFare = calculateFare;
