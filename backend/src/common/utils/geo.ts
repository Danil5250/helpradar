import { randomInt } from 'crypto';

const EARTH_RADIUS_M = 6_371_000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/** Uniform random number in [0, 1) from the OS entropy source (the shift must be unpredictable). */
const secureRandom = () => randomInt(0, 2 ** 30) / 2 ** 30;

/** Great-circle distance in metres (haversine formula). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Public ("approximate") location of an announcement (SRS 3.2.4.3 step 7): the exact point is
 * shifted in a random direction by a random distance between `minMeters` and `maxMeters`
 * (SRS: within 300 m). A minimum shift keeps the exact address from leaking when the random
 * distance happens to be tiny.
 */
export function randomShift(
  point: GeoPoint,
  minMeters: number,
  maxMeters: number,
  random: () => number = secureRandom,
): GeoPoint {
  const bearing = random() * 2 * Math.PI;
  const angular =
    (minMeters + random() * (maxMeters - minMeters)) / EARTH_RADIUS_M;
  const lat1 = toRad(point.latitude);
  const lng1 = toRad(point.longitude);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {
    latitude: round6(toDeg(lat2)),
    longitude: round6(((toDeg(lng2) + 540) % 360) - 180),
  };
}
