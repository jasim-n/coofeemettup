'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type EventDto, type GenderTrack } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AREAS = ['F-6', 'F-7', 'Blue Area', 'Gulberg'];
const TRACK: Record<string, { label: string; badge: 'brand' | 'secondary'; bar: string }> = {
  WOMEN_ONLY: { label: 'women only', badge: 'brand', bar: 'bg-gradient-sky' },
  MEN_ONLY: { label: 'men only', badge: 'secondary', bar: 'bg-gradient-sky' },
  MIXED: { label: 'mixed', badge: 'secondary', bar: 'bg-gradient-ember' },
};
const selectClass =
  'h-10 rounded-full border border-input bg-card/60 px-4 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

export default function EventsPage() {
  const [events, setEvents] = useState<EventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState('');
  const [track, setTrack] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const params: { area?: string; genderTrack?: GenderTrack } = {};
        if (area) params.area = area;
        if (track) params.genderTrack = track as GenderTrack;
        const list = await api.browseEvents(params);
        if (active) {
          setEvents(list);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load events');
      }
    })();
    return () => {
      active = false;
    };
  }, [area, track]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Islamabad · Lahore</p>
          <h1 className="display mt-1 text-3xl">Upcoming meetups</h1>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/map" className="text-primary hover:underline">
            Map
          </Link>
          <Link href="/" className="text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <select className={selectClass} value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">All areas</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select className={selectClass} value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="">All tracks</option>
          <option value="WOMEN_ONLY">Women only</option>
          <option value="MEN_ONLY">Men only</option>
          <option value="MIXED">Mixed</option>
        </select>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {!events && !error && <p className="text-muted-foreground text-sm">Loading…</p>}
      {events && events.length === 0 && (
        <div className="rounded-3xl border border-dashed py-14 text-center">
          <p className="text-3xl">🫖</p>
          <p className="text-muted-foreground mt-2 text-sm">No meetups match your filters.</p>
        </div>
      )}

      <div className="space-y-4">
        {events?.map((ev) => {
          const t = TRACK[ev.genderTrack];
          const low = ev.seatsLeft > 0 && ev.seatsLeft <= 2;
          return (
            <Link key={ev.id} href={`/events/${ev.id}`} className="block">
              <Card className="flex-row gap-0 p-0 transition-all hover:-translate-y-0.5 hover:shadow-glow">
                <div className={`w-2 shrink-0 ${t?.bar ?? 'bg-gradient-ember'}`} />
                <CardContent className="flex-1 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-heading text-lg font-bold tracking-tight">
                      {ev.title ?? 'Coffee meetup'}
                    </h2>
                    <Badge variant={t?.badge ?? 'secondary'}>{t?.label ?? ev.genderTrack}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                    <p>🗓️ {formatDateTime(ev.startAt)}</p>
                    <p>📍 {ev.cafe?.name ?? ev.area}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-heading text-primary text-lg font-extrabold">
                      {formatPKR(ev.pricePKR)}
                    </span>
                    <Badge variant={low ? 'warning' : 'secondary'}>
                      {ev.seatsLeft > 0 ? `${ev.seatsLeft} seats left` : 'full'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
