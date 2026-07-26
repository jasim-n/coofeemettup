'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const CAT_EMOJI: Record<string, string> = {
  'Deep talks': '💬',
  'Coffee & chill': '☕',
  Networking: '🤝',
  Books: '📚',
  Startups: '🚀',
  'Language exchange': '🗣️',
  'Board games': '🎲',
};
const emojiFor = (c: string) => CAT_EMOJI[c] ?? '🪑';

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
      { padding: 70, maxZoom: 14, duration: 600 },
    );
  }, [pins, loaded]);

  const select = useCallback((p: Pin) => {
    setSelectedId(p.table.id);
    // Ease the pin toward centre so its popup isn't clipped at the edge.
    mapRef.current?.easeTo({ center: [p.lng, p.lat], duration: 400 });
  }, []);

  const selected = pins.find((p) => p.table.id === selectedId) ?? null;

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 13,
          duration: 700,
        }),
      () => undefined,
      { timeout: 5000 },
    );
  }, []);

  return (
    <div className="relative h-[74vh] w-full overflow-hidden rounded-3xl border shadow-soft">
      <MapGL
        ref={mapRef}
        onLoad={() => setLoaded(true)}
        initialViewState={{ longitude: 73.7, latitude: 32.6, zoom: 6 }}
        mapStyle={OSM_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {pins.map((p) => {
          const active = selectedId === p.table.id;
          return (
            <Marker key={p.table.id} longitude={p.lng} latitude={p.lat} onClick={() => select(p)}>
              <button
                type="button"
                className={`flex h-9 items-center gap-1 rounded-full border-2 border-white px-2.5 text-xs font-bold shadow-md transition-transform ${
                  active
                    ? 'bg-ink z-10 scale-[1.15] text-white ring-2 ring-primary'
                    : 'bg-primary text-primary-foreground hover:scale-110'
                }`}
                title={p.name}
              >
                <span className="text-sm">{emojiFor(p.table.category)}</span>
                <span>{p.table.seatsLeft}</span>
              </button>
            </Marker>
          );
        })}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={22}
            maxWidth="290px"
            closeOnClick={false}
            onClose={() => setSelectedId(null)}
            className="table-popup"
          >
            <TableCard pin={selected} onClose={() => setSelectedId(null)} />
          </Popup>
        )}
      </MapGL>

      {/* count pill */}
      <div className="glass ring-border/60 absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-bold ring-1">
        🪑 {pins.length} table{pins.length === 1 ? '' : 's'} nearby
      </div>

      {/* locate-me */}
      <button
        type="button"
        onClick={locate}
        className="glass ring-border/60 absolute right-3 bottom-3 grid size-10 place-items-center rounded-full text-lg shadow-md ring-1 transition-transform hover:scale-105"
        title="Center on my location"
      >
        📍
      </button>

      {error && <p className="text-destructive absolute left-3 top-14 text-sm">{error}</p>}
    </div>
  );
}

function TableCard({ pin, onClose }: { pin: Pin; onClose: () => void }) {
  const t = pin.table;
  return (
    <div className="bg-card w-64 rounded-2xl p-3.5 shadow-glow">
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading text-sm font-bold tracking-tight">
          {emojiFor(t.category)} {t.title ?? t.category}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground -mt-0.5 shrink-0 text-sm"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">📍 {pin.name}</p>
      <p className="text-muted-foreground text-xs">🗓️ {formatDateTime(t.startAt)}</p>
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            t.pricePKR == null
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
        </span>
        <span className="text-muted-foreground text-xs font-medium">🪑 {t.seatsLeft} left</span>
      </div>
      <Link
        href={`/tables/${t.id}`}
        className="bg-primary text-primary-foreground mt-3 block rounded-full py-2 text-center text-xs font-semibold transition-[filter] hover:brightness-110"
      >
        View &amp; request →
      </Link>
    </div>
  );
}
