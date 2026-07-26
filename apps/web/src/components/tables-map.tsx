'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { ApiError, type TableDto } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';

// Free OpenStreetMap raster tiles — no token / account required.
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

interface Pin {
  table: TableDto;
  lat: number;
  lng: number;
  name: string;
}

const POLL_MS = 15_000;

export default function TablesMap() {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await api.browseTables();
        if (active) {
          setError(null);
          setTables(next);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load tables');
      }
    };
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const pins = useMemo(() => {
    const out: Pin[] = [];
    for (const t of tables) {
      const lat = t.lat ?? t.cafe?.lat ?? null;
      const lng = t.lng ?? t.cafe?.lng ?? null;
      if (lat == null || lng == null) continue;
      out.push({ table: t, lat, lng, name: t.venueName ?? t.cafe?.name ?? t.category });
    }
    return out;
  }, [tables]);

  // Frame the map around wherever the tables actually are.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !loaded || pins.length === 0) return;
    if (pins.length === 1) {
      m.flyTo({ center: [pins[0]!.lng, pins[0]!.lat], zoom: 13, duration: 600 });
      return;
    }
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const p of pins) {
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
    }
    m.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 14, duration: 600 },
    );
  }, [pins, loaded]);

  const selected = pins.find((p) => p.table.id === selectedId) ?? null;

  return (
    <div className="relative h-[72vh] w-full overflow-hidden rounded-3xl border shadow-soft">
      {error && <p className="text-destructive absolute z-10 p-4 text-sm">{error}</p>}
      <MapGL
        ref={mapRef}
        onLoad={() => setLoaded(true)}
        initialViewState={{ longitude: 73.7, latitude: 32.6, zoom: 6 }}
        mapStyle={OSM_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {pins.map((p) => (
          <Marker
            key={p.table.id}
            longitude={p.lng}
            latitude={p.lat}
            onClick={() => setSelectedId(p.table.id)}
          >
            <button
              type="button"
              className="bg-primary text-primary-foreground flex h-9 items-center justify-center rounded-full border-2 border-white px-2.5 text-xs font-semibold shadow-md"
              title={p.name}
            >
              🪑 {p.table.seatsLeft}
            </button>
          </Marker>
        ))}
        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={18}
            maxWidth="260px"
            onClose={() => setSelectedId(null)}
            closeOnClick={false}
          >
            <div className="space-y-1 p-1">
              <p className="text-sm font-semibold">
                {selected.table.title ?? selected.table.category}
              </p>
              <p className="text-muted-foreground text-xs">{selected.name}</p>
              <p className="text-muted-foreground text-xs">
                {formatDateTime(selected.table.startAt)} ·{' '}
                {selected.table.pricePKR == null ? 'Free' : formatPKR(selected.table.pricePKR)} ·{' '}
                {selected.table.seatsLeft} left
              </p>
              <Link href={`/tables/${selected.table.id}`} className="text-primary text-xs underline">
                View &amp; request →
              </Link>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
