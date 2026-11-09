/**
 * Helps sellers picture a sales radius: fixed, meaningful stops, a plain
 * description of each ("Across town", "about 20–30 minutes by car") and, when
 * the seller's location is known, a real town at about that distance
 * ("About as far as Warri, 5.9 km").
 *
 * Towns come from a bundled list of Nigerian cities and towns
 * (src/assets/data/ngTowns.json, built from OpenStreetMap, © OpenStreetMap
 * contributors, ODbL). Distances are computed on the device: instant, works
 * offline, no API. Outside Nigeria only the descriptions are shown.
 */
import NG_TOWNS from '../assets/data/ngTowns.json';

/** Slider stops in km; after the last stop comes Anywhere (`null`). */
export const SALES_RADIUS_STOPS = [1, 2, 5, 10, 20, 50, 100] as const;

export interface RadiusDescription {
  scope: string;
  travel: string;
  icon: string;
}

/** `campus` (the seller's school) makes the short distances concrete. */
export const describeRadius = (km: number | null, campus?: string | null): RadiusDescription => {
  const school = campus?.trim();
  if (km == null) {
    return {
      scope: 'Anywhere',
      travel: 'Buyers anywhere can order. Plan for shipping or drop-off stations.',
      icon: 'public',
    };
  }
  if (km <= 1)
    return {
      scope: school ? `Around ${school}` : 'Your campus',
      travel: 'About a 12-minute walk',
      icon: 'school',
    };
  if (km <= 2)
    return {
      scope: school ? `${school} and nearby hostels` : 'Campus and nearby hostels',
      travel: 'About 25 minutes on foot, or 5 by keke',
      icon: 'directions-walk',
    };
  if (km <= 5)
    return { scope: 'Your neighbourhood', travel: 'About 10–15 minutes by keke or car', icon: 'holiday-village' };
  if (km <= 10) return { scope: 'Across town', travel: 'About 20–30 minutes by car', icon: 'location-city' };
  if (km <= 20) return { scope: 'Your whole city', travel: 'About 30–45 minutes by car', icon: 'apartment' };
  if (km <= 50)
    return { scope: 'Your city and nearby towns', travel: 'About an hour by car', icon: 'directions-car' };
  return { scope: 'Your wider region', travel: 'About 2 hours by car', icon: 'map' };
};

export interface Coords {
  lat: number;
  lng: number;
}

/** [name, lat, lng, isCity (1/0), population (0 = unknown)] */
export type TownRow = [string, number, number, number, number];

export interface Landmark {
  name: string;
  km: number;
  isCity: boolean;
  population: number;
}

export const haversineKm = (a: Coords, b: Coords) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** Towns within reach of the largest stop, with their distance from `origin`. */
export const nearbyTowns = (
  origin: Coords,
  rows: TownRow[] = NG_TOWNS as TownRow[],
  maxKm = SALES_RADIUS_STOPS[SALES_RADIUS_STOPS.length - 1] * 1.05,
): Landmark[] => {
  // Cheap bounding-box filter before the exact distance (~111 km/degree).
  const latSpan = maxKm / 111;
  const lngSpan = maxKm / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));
  const out: Landmark[] = [];
  for (const [name, lat, lng, isCity, population] of rows) {
    if (Math.abs(lat - origin.lat) > latSpan || Math.abs(lng - origin.lng) > lngSpan) continue;
    const km = haversineKm(origin, { lat, lng });
    if (km <= maxKm) out.push({ name, km, isCity: isCity === 1, population });
  }
  return out;
};

/**
 * The best-known town at about `km` away: between half the radius and just
 * past it, favouring cities and bigger towns, and towns near the edge.
 */
export const landmarkForRadius = (landmarks: Landmark[], km: number): Landmark | null => {
  let best: Landmark | null = null;
  let bestScore = -Infinity;
  for (const l of landmarks) {
    if (l.km < Math.max(0.3, km * 0.5) || l.km > km * 1.05) continue;
    const score =
      (l.isCity ? 12 : 10) +
      Math.min(3, Math.log10(1 + l.population) / 2) -
      Math.abs(1 - l.km / km) * 10;
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  return best;
};

export const formatLandmarkKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
