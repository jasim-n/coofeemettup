import { Controller, Get, Query } from '@nestjs/common';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}

/** Approximate Pakistan bbox for Photon (minLon,minLat,maxLon,maxLat). */
const PK_BBOX = '60.87,23.63,77.84,37.15';
const PK_MIN_LNG = 60.87;
const PK_MAX_LNG = 77.84;
const PK_MIN_LAT = 23.63;
const PK_MAX_LAT = 37.15;

function inPakistan(lat: number, lng: number): boolean {
  return (
    lng >= PK_MIN_LNG &&
    lng <= PK_MAX_LNG &&
    lat >= PK_MIN_LAT &&
    lat <= PK_MAX_LAT
  );
}

/**
 * Free place search via Photon (Komoot's OSM geocoder — no API key). Proxied
 * server-side so we can set a proper User-Agent and keep usage tidy.
 * English labels; results restricted to Pakistan.
 */
@Controller('geocode')
export class GeoController {
  @Get()
  async search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 3) return [];

    const url =
      `https://photon.komoot.io/api?q=${encodeURIComponent(term)}` +
      `&limit=8&lang=en&bbox=${PK_BBOX}` +
      `&lat=30.3753&lon=69.3451`;

    let data: { features?: PhotonFeature[] };
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'CoffeeMeetups/1.0 (support@coffeemeetups.dev)',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return [];
      data = (await res.json()) as { features?: PhotonFeature[] };
    } catch {
      return [];
    }

    return (data.features ?? [])
      .map((f) => {
        const p = f.properties ?? {};
        const [lng, lat] = f.geometry?.coordinates ?? [];
        const country = (p.countrycode ?? p.country ?? '').toLowerCase();
        const name =
          p.name ??
          [p.housenumber, p.street].filter(Boolean).join(' ') ??
          'Unnamed place';
        const label = [p.name, p.street, p.district, p.city, p.state, p.country]
          .filter(Boolean)
          .join(', ');
        return { name, label, lat, lng, country };
      })
      .filter(
        (
          r,
        ): r is {
          name: string;
          label: string;
          lat: number;
          lng: number;
          country: string;
        } =>
          typeof r.lat === 'number' &&
          typeof r.lng === 'number' &&
          inPakistan(r.lat, r.lng) &&
          (r.country === '' ||
            r.country === 'pk' ||
            r.country.includes('pakistan')),
      )
      .slice(0, 6)
      .map(({ name, label, lat, lng }) => ({ name, label, lat, lng }));
  }
}
