'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { ApiError, type EventDto } from '@jrst/api-client';
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

interface LocationGroup {
  key: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  events: EventDto[];
  seatsLeft: number;
}

const POLL_MS = 15_000;

export default function EventsMap() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const [loaded, setLoaded] = useState(false);

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

  // One pin per location. An event's custom pin overrides its cafe when set;
  // otherwise events at the same cafe share a pin.
  const groups = useMemo(() => {
    const map = new Map<string, LocationGroup>();
    for (const e of events) {
      const hasCustom = e.lat != null && e.lng != null;
      const lat = hasCustom ? e.lat! : (e.cafe?.lat ?? null);
      const lng = hasCustom ? e.lng! : (e.cafe?.lng ?? null);
      if (lat == null || lng == null) continue;
      const key = hasCustom
        ? `custom:${lat.toFixed(5)},${lng.toFixed(5)}`
        : `cafe:${e.cafe!.id}`;
      const name = hasCustom ? (e.venueName ?? 'Meetup spot') : (e.cafe?.name ?? e.area);
      const area = hasCustom ? (e.venueAddress ?? e.area) : (e.cafe?.area ?? e.area);
      const g = map.get(key) ?? { key, name, area, lat, lng, events: [], seatsLeft: 0 };
      g.events.push(e);
      g.seatsLeft += e.seatsLeft;
      map.set(key, g);
    }
    return [...map.values()];
  }, [events]);

  // Frame the map around wherever the meetups actually are (Islamabad, Lahore, …),
  // instead of a fixed city. Refits whenever the set of pins changes.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !loaded || groups.length === 0) return;
    if (groups.length === 1) {
      const g = groups[0]!;
      m.flyTo({ center: [g.lng, g.lat], zoom: 13, duration: 600 });
      return;
    }
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const g of groups) {
      minLng = Math.min(minLng, g.lng);
      maxLng = Math.max(maxLng, g.lng);
      minLat = Math.min(minLat, g.lat);
      maxLat = Math.max(maxLat, g.lat);
    }
    m.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 14, duration: 600 },
    );
  }, [groups, loaded]);

  const selected = groups.find((g) => g.key === selectedId) ?? null;

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border">
      {error && <p className="text-destructive absolute z-10 p-4 text-sm">{error}</p>}
      <MapGL
        ref={mapRef}
        onLoad={() => setLoaded(true)}
        initialViewState={{ longitude: 73.7, latitude: 32.6, zoom: 6 }}
        mapStyle={OSM_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        {groups.map((g) => (
          <Marker
            key={g.key}
            longitude={g.lng}
            latitude={g.lat}
            onClick={() => setSelectedId(g.key)}
          >
            <button
              type="button"
              className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-md"
              title={`${g.name} — ${g.events.length} meetup(s)`}
            >
              {g.events.length}
            </button>
          </Marker>
        ))}
        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={16}
            maxWidth="260px"
            onClose={() => setSelectedId(null)}
            closeOnClick={false}
          >
            <div className="space-y-2 p-1">
              <p className="text-sm font-medium">{selected.name}</p>
              <p className="text-muted-foreground text-xs">
                {selected.area} · {selected.seatsLeft} seats left
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
