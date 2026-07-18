'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type EventDto, type GenderTrack } from '@jrst/api-client';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

const AREAS = ['F-6', 'F-7', 'Blue Area', 'Gulberg'];
const TRACK_BADGE: Record<string, string> = {
  WOMEN_ONLY: 'bg-pink-100 text-pink-700 border-transparent',
  MEN_ONLY: 'bg-sky-100 text-sky-700 border-transparent',
  MIXED: 'bg-accent text-accent-foreground border-transparent',
};
const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring';

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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Upcoming meetups</h1>
        <div className="flex gap-3 text-sm">
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
        <p className="text-muted-foreground text-sm">No meetups match your filters.</p>
      )}

      <div className="space-y-3">
        {events?.map((ev) => (
          <Link key={ev.id} href={`/events/${ev.id}`} className="block">
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="font-heading text-lg">
                    {ev.title ?? 'Coffee meetup'}
                  </CardTitle>
                  <Badge className={TRACK_BADGE[ev.genderTrack]}>
                    {ev.genderTrack.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>{formatDateTime(ev.startAt)}</span>
                <span>{ev.cafe?.name ?? ev.area}</span>
                <span>{formatPKR(ev.pricePKR)}</span>
                <span>{ev.seatsLeft} seats left</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/profile" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
          Edit your profile
        </Link>
      </div>
    </main>
  );
}
