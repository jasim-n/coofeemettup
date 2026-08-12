import { Controller, Get, Query } from '@nestjs/common';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}

/**
 * Free place search via Photon (Komoot's OSM geocoder — no API key). Proxied
 * server-side so we can set a proper User-Agent and keep usage tidy.
 */
@Controller('geocode')
export class GeoController {
  @Get()
  async search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 3) return [];

    // Bias toward Pakistan so local venues rank first.
    const url =
      `https://photon.komoot.io/api?q=${encodeURIComponent(term)}` +
      `&limit=6&lang=en&lat=30.3753&lon=69.3451`;

    let data: { features?: PhotonFeature[] };
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CoffeeMeetups/1.0 (support@coffeemeetups.dev)' },
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
        const name =
          p.name ??
          [p.housenumber, p.street].filter(Boolean).join(' ') ??
          'Unnamed place';
        const label = [p.name, p.street, p.district, p.city, p.state, p.country]
          .filter(Boolean)
          .join(', ');
        return { name, label, lat, lng };
      })
      .filter(
        (r): r is { name: string; label: string; lat: number; lng: number } =>
          typeof r.lat === 'number' && typeof r.lng === 'number',
      );
  }
}
