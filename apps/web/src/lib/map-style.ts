/**
 * Shared MapLibre config: English-label basemap + Pakistan-only view.
 * OpenFreeMap (OpenMapTiles) — free, no API key; prefers Latin/English names.
 */

/** [[minLng, minLat], [maxLng, maxLat]] — approximate Pakistan extent. */
export const PAKISTAN_MAX_BOUNDS: [[number, number], [number, number]] = [
  [60.87, 23.63],
  [77.84, 37.15],
];

/** Photon `bbox=minLon,minLat,maxLon,maxLat` for Pakistan-only place search. */
export const PAKISTAN_BBOX =
  `${PAKISTAN_MAX_BOUNDS[0][0]},${PAKISTAN_MAX_BOUNDS[0][1]},` +
  `${PAKISTAN_MAX_BOUNDS[1][0]},${PAKISTAN_MAX_BOUNDS[1][1]}`;

export const PAKISTAN_CENTER = { lng: 69.3451, lat: 30.3753 };
export const ISLAMABAD_CENTER = { lng: 73.0479, lat: 33.6844 };

/** Free MapLibre style URL (English-oriented labels vs OSM raster local script). */
export const MAP_STYLE_EN = 'https://tiles.openfreemap.org/styles/liberty';

export function isInPakistan(lat: number, lng: number): boolean {
  const [[minLng, minLat], [maxLng, maxLat]] = PAKISTAN_MAX_BOUNDS;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}
