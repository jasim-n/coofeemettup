'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { ApiError, type Cafe, type EventDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';

// Free OpenStreetMap raster tiles — no access token / account required.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

interface CafeGroup {
  cafe: Cafe;
  events: EventDto[];
  seatsLeft: number;
}

const POLL_MS = 15_000;

export default function EventsMap() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lng: number; lat: number }>({
    lng: 73.0479,
    lat: 33.6844, // Islamabad fallback
  });

  // Center on the user's real location if they allow it.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => undefined,
      { timeout: 5000 },
    );
  }, []);

  // Load + poll for live seat counts.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await api.browseEvents();
        if (active) {
          setError(null);
          setEvents(next);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load events');
      }
    };
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // One pin per cafe (events at the same venue share a location).
  const groups = useMemo(() => {
    const byCafe = new Map<string, CafeGroup>();
    for (const e of events) {
      if (!e.cafe || e.cafe.lat == null || e.cafe.lng == null) continue;
      const g = byCafe.get(e.cafe.id) ?? { cafe: e.cafe, events: [], seatsLeft: 0 };
      g.events.push(e);
      g.seatsLeft += e.seatsLeft;
      byCafe.set(e.cafe.id, g);
    }
    return [...byCafe.values()];
  }, [events]);

  const selected = groups.find((g) => g.cafe.id === selectedId) ?? null;

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border">
      {error && <p className="text-destructive absolute z-10 p-4 text-sm">{error}</p>}
      <MapGL
        key={`${center.lng},${center.lat}`}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 12 }}
        mapStyle={OSM_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        {groups.map((g) => (
          <Marker
            key={g.cafe.id}
            longitude={g.cafe.lng!}
            latitude={g.cafe.lat!}
            onClick={() => setSelectedId(g.cafe.id)}
          >
            <button
              type="button"
              className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-md"
              title={`${g.cafe.name} — ${g.events.length} meetup(s)`}
            >
              {g.events.length}
            </button>
          </Marker>
        ))}
        {selected && (
          <Popup
            longitude={selected.cafe.lng!}
            latitude={selected.cafe.lat!}
            anchor="bottom"
            offset={16}
            maxWidth="260px"
            onClose={() => setSelectedId(null)}
            closeOnClick={false}
          >
            <div className="space-y-2 p-1">
              <p className="text-sm font-medium">{selected.cafe.name}</p>
              <p className="text-muted-foreground text-xs">
                {selected.cafe.area} · {selected.seatsLeft} seats left
              </p>
              <ul className="max-h-48 space-y-2 overflow-auto">
                {selected.events.map((e) => (
                  <li key={e.id} className="border-t pt-2 first:border-t-0 first:pt-0">
                    <p className="text-xs font-medium">{e.title ?? 'Coffee meetup'}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(e.startAt)} · {formatPKR(e.pricePKR)} · {e.seatsLeft} left
                    </p>
                    <Link href={`/events/${e.id}`} className="text-primary text-xs underline">
                      View &amp; join →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
