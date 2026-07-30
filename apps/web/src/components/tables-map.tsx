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
import { Spinner } from '@/components/spinner';
import { Input } from '@/components/ui/input';

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

const TIMES = [
  { key: 'morning', label: 'Morning', emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening', label: 'Evening', emoji: '🌙' },
] as const;
type TimeKey = (typeof TIMES)[number]['key'];

/** Local-time bucket for an ISO timestamp. 05–11 morning · 12–16 afternoon · else evening. */
function timeBucket(iso: string): TimeKey {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

const chipCls = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
    active ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card hover:bg-muted'
  }`;

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
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapRef | null>(null);
  const railRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);

  // filters
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [times, setTimes] = useState<TimeKey[]>([]);
  const activeCount = (fromDate ? 1 : 0) + (toDate ? 1 : 0) + times.length;
  const toggleTime = (k: TimeKey) =>
    setTimes((ts) => (ts.includes(k) ? ts.filter((x) => x !== k) : [...ts, k]));
  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setTimes([]);
  };

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
      } finally {
        if (active) setLoading(false);
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

  const visible = useMemo(() => {
    return pins.filter((p) => {
      const d = new Date(p.table.startAt);
      if (fromDate && d < new Date(`${fromDate}T00:00:00`)) return false;
      if (toDate && d > new Date(`${toDate}T23:59:59`)) return false;
      if (times.length && !times.includes(timeBucket(p.table.startAt))) return false;
      return true;
    });
  }, [pins, fromDate, toDate, times]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready || visible.length === 0) return;
    if (visible.length === 1) {
      m.flyTo({ center: [visible[0]!.lng, visible[0]!.lat], zoom: 13, duration: 600 });
      return;
    }
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const p of visible) {
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
  }, [visible, ready]);

  const select = useCallback((p: Pin, scrollRail = false) => {
    setSelectedId(p.table.id);
    mapRef.current?.easeTo({ center: [p.lng, p.lat], duration: 400 });
    if (scrollRail)
      railRefs.current[p.table.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

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

  const selected = visible.find((p) => p.table.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="bg-card shadow-soft ring-border/60 hover:bg-muted flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition-colors"
        >
          <span aria-hidden>⚙</span> Filters
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground ml-0.5 grid size-4 place-items-center rounded-full text-[10px]">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            Clear
          </button>
        )}
        <span className="text-muted-foreground ml-auto text-sm font-medium">
          {loading ? 'Finding tables…' : `${visible.length} of ${pins.length} tables`}
        </span>
      </div>

      {showFilters && (
        <div className="bg-card shadow-soft ring-border/60 space-y-3 rounded-2xl p-4 ring-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold">From date</span>
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs font-semibold">To date</span>
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-semibold">Time of day</span>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTime(t.key)}
                  className={chipCls(times.includes(t.key))}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:h-[74vh] md:flex-row">
      {/* desktop list rail */}
      <aside className="hidden md:flex md:w-80 md:shrink-0 md:flex-col md:overflow-y-auto md:pr-1">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="eyebrow text-primary">
            {loading ? 'Finding tables…' : `${visible.length} nearby`}
          </span>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="text-primary text-xs font-semibold hover:underline"
          >
            Filters {activeCount > 0 ? `(${activeCount})` : '→'}
          </button>
        </div>
        {loading ? (
          <div className="grid flex-1 place-items-center">
            <Spinner className="text-primary size-6" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">
            {activeCount > 0
              ? 'No tables match these filters.'
              : 'No open tables nearby right now.'}
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((p) => {
              const t = p.table;
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    railRefs.current[t.id] = el;
                  }}
                  type="button"
                  onClick={() => select(p)}
                  className={`w-full rounded-2xl bg-card p-3 text-left ring-1 transition-all hover:-translate-y-0.5 ${
                    active ? 'ring-primary shadow-glow' : 'ring-border/60 shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-heading text-sm font-bold tracking-tight">
                      {emojiFor(t.category)} {t.title ?? t.category}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.pricePKR == null
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">📍 {p.name}</p>
                  <p className="text-muted-foreground text-xs">🗓️ {formatDateTime(t.startAt)}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">🪑 {t.seatsLeft} left</span>
                    <Link
                      href={`/tables/${t.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* map */}
      <div className="relative h-[68vh] flex-1 overflow-hidden rounded-3xl border shadow-soft md:h-full">
        {loading && (
          <div className="bg-background/60 absolute inset-0 z-10 grid place-items-center backdrop-blur-sm">
            <Spinner className="text-primary size-8" />
          </div>
        )}
        <MapGL
          ref={mapRef}
          onLoad={() => setReady(true)}
          initialViewState={{ longitude: 73.7, latitude: 32.6, zoom: 6 }}
          mapStyle={OSM_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {visible.map((p) => {
            const active = selectedId === p.table.id;
            return (
              <Marker
                key={p.table.id}
                longitude={p.lng}
                latitude={p.lat}
                onClick={() => select(p, true)}
              >
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

        <div className="glass ring-border/60 absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-bold ring-1">
          🪑 {visible.length} table{visible.length === 1 ? '' : 's'} nearby
        </div>
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
      </div>
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
