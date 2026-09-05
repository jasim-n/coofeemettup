import type { TableDto } from '@jrst/api-client';

export const CITIES = ['Islamabad', 'Lahore', 'Karachi', 'Rawalpindi'] as const;
export type City = (typeof CITIES)[number];

export const CITY_COORDS: Record<City, { lat: number; lng: number }> = {
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Lahore: { lat: 31.5497, lng: 74.3436 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
};

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function tableCoords(t: TableDto): { lat: number; lng: number } | null {
  const lat = t.lat ?? t.cafe?.lat ?? null;
  const lng = t.lng ?? t.cafe?.lng ?? null;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function formatDistance(km: number | null): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function nearestCity(t: TableDto): City | null {
  const c = tableCoords(t);
  if (!c) return null;
  let best: City | null = null;
  let bestKm = Infinity;
  for (const city of CITIES) {
    const center = CITY_COORDS[city];
    const d = haversineKm(c.lat, c.lng, center.lat, center.lng);
    if (d < bestKm) {
      bestKm = d;
      best = city;
    }
  }
  return best;
}
