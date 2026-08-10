'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  AttendanceStatus,
  EventStatus,
  GenderTrack,
  type BookingWithUser,
  type Cafe,
  type CreateEventInput,
  type EventDto,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/spinner';

// Native <select> styled to match the shared <Input>.
const selectCls =
  'h-11 w-full rounded-2xl border border-input bg-card/60 px-4 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

type StatusFilter = 'ALL' | EventStatus;
const STATUSES: EventStatus[] = [
  'DRAFT',
  'OPEN',
  'FULL',
  'CLOSED',
  'CANCELLED',
  'COMPLETED',
];
const TRACK_LABEL: Record<GenderTrack, string> = {
  WOMEN_ONLY: 'Women only',
  MEN_ONLY: 'Men only',
  MIXED: 'Mixed',
};
const STATUS_STYLE: Record<EventStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  OPEN: 'bg-primary/15 text-primary',
  FULL: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

type FormState = {
  cafeId: string;
  title: string;
  startAt: string; // datetime-local (YYYY-MM-DDTHH:mm)
  genderTrack: GenderTrack;
  area: string;
  capacity: string;
  pricePKR: string;
  venueName: string;
  venueAddress: string;
};

const EMPTY: FormState = {
  cafeId: '',
  title: '',
  startAt: '',
  genderTrack: 'MIXED',
  area: '',
  capacity: '4',
  pricePKR: '0',
  venueName: '',
  venueAddress: '',
};

// ISO → value for <input type="datetime-local"> (in local time).
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function toInput(f: FormState): CreateEventInput {
  return {
    cafeId: f.cafeId,
    title: f.title.trim() || undefined,
    startAt: new Date(f.startAt).toISOString(),
    genderTrack: f.genderTrack,
    area: f.area.trim(),
    capacity: Number(f.capacity),
    pricePKR: Number(f.pricePKR),
    venueName: f.venueName.trim() || undefined,
    venueAddress: f.venueAddress.trim() || undefined,
  };
}

function fromEvent(e: EventDto): FormState {
  return {
    cafeId: e.cafeId,
    title: e.title ?? '',
    startAt: toLocalInput(e.startAt),
    genderTrack: e.genderTrack,
    area: e.area,
    capacity: String(e.capacity),
    pricePKR: String(e.pricePKR),
    venueName: e.venueName ?? '',
    venueAddress: e.venueAddress ?? '',
  };
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminEventsPage() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<EventDto[] | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  // expandable bookings panel per event
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bookings, setBookings] = useState<Record<string, BookingWithUser[]>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const load = useCallback(() => {
    if (!isAdmin) return;
    api.listAllEvents().then(setEvents).catch(() => setEvents([]));
    api.listCafes().then(setCafes).catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader />;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only.{' '}
        <Link href="/" className="underline">
          Home
        </Link>
      </main>
    );

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card hover:bg-muted'
    }`;

  async function save(form: FormState, id?: string) {
    setError(null);
    setBusy(true);
    try {
      if (id) await api.updateEvent(id, toInput(form));
      else await api.createEvent(toInput(form));
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save event');
    } finally {
      setBusy(false);
    }
  }

  async function cancelEvent(e: EventDto) {
    if (!window.confirm(`Cancel "${e.title ?? 'this event'}"? Attendees lose their seat.`)) return;
    setError(null);
    setBusy(true);
    try {
      await api.cancelEvent(e.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel event');
    } finally {
      setBusy(false);
    }
  }

  async function toggleManage(e: EventDto) {
    const open = expanded[e.id];
    setExpanded((p) => ({ ...p, [e.id]: !open }));
    if (!open && !bookings[e.id]) {
      try {
        const list = await api.eventBookings(e.id);
        setBookings((p) => ({ ...p, [e.id]: list }));
      } catch {
        setBookings((p) => ({ ...p, [e.id]: [] }));
      }
    }
  }

  async function setAttendance(
    eventId: string,
    bookingId: string,
    status: AttendanceStatus,
  ) {
    setRowBusy((p) => ({ ...p, [bookingId]: true }));
    try {
      await api.markAttendance(bookingId, status);
      setBookings((p) => ({
        ...p,
        [eventId]: (p[eventId] ?? []).map((b) =>
          b.id === bookingId ? { ...b, attendanceStatus: status } : b,
        ),
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update attendance');
    } finally {
      setRowBusy((p) => ({ ...p, [bookingId]: false }));
    }
  }

  const cafeName = (id: string) => cafes.find((c) => c.id === id)?.name ?? 'Unknown cafe';
  const visible = (events ?? []).filter((e) => filter === 'ALL' || e.status === filter);

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-10">
      <div className="mb-8">
        <p className="eyebrow text-primary">Admin console</p>
        <h1 className="display mt-1 text-4xl uppercase">Events</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin" className="text-muted-foreground hover:underline">
            ← Admin
          </Link>
          <Link href="/admin/cafes" className="text-primary hover:underline">
            Cafes
          </Link>
          <Link href="/admin/tables" className="text-primary hover:underline">
            Tables
          </Link>
        </div>
      </div>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      {editing === 'new' ? (
        <EventForm
          initial={EMPTY}
          cafes={cafes}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(f) => void save(f)}
        />
      ) : (
        <Button
          className="mb-6"
          disabled={cafes.length === 0}
          onClick={() => setEditing('new')}
        >
          {cafes.length === 0 ? 'Add a cafe first' : '+ Add event'}
        </Button>
      )}

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(['ALL', ...STATUSES] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={chip(filter === s)}>
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {events === null ? (
        <PageLoader />
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed py-10 text-center">
          <p className="text-3xl">📅</p>
          <p className="text-muted-foreground mt-2 text-sm">
            No events match this filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((e) =>
            editing === e.id ? (
              <EventForm
                key={e.id}
                initial={fromEvent(e)}
                cafes={cafes}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={(f) => void save(f, e.id)}
              />
            ) : (
              <Card key={e.id} className="rounded-3xl shadow-soft">
                <CardContent className="py-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-bold tracking-tight">
                          {e.title ?? 'Untitled event'}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[e.status]}`}
                        >
                          {e.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {fmtWhen(e.startAt)} · {e.venueName || cafeName(e.cafeId)} · {e.area}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {TRACK_LABEL[e.genderTrack]} · {e.seatsLeft}/{e.capacity} seats left ·{' '}
                        {e.pricePKR > 0 ? `PKR ${e.pricePKR}` : 'Free'} ·{' '}
                        {e._count?.bookings ?? 0} booking(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button size="xs" variant="outline" onClick={() => void toggleManage(e)}>
                        {expanded[e.id] ? 'Hide' : 'Manage'}
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => setEditing(e.id)}>
                        Edit
                      </Button>
                      {e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && (
                        <Button
                          size="xs"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void cancelEvent(e)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bookings / attendance panel */}
                  {expanded[e.id] && (
                    <div className="mt-4 border-t pt-3">
                      {!bookings[e.id] ? (
                        <p className="text-muted-foreground text-xs">Loading bookings…</p>
                      ) : bookings[e.id].length === 0 ? (
                        <p className="text-muted-foreground text-xs">No bookings yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {bookings[e.id].map((b) => (
                            <li
                              key={b.id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <div className="text-xs">
                                <span className="font-semibold">
                                  {b.user.firstName} {b.user.lastInitial}.
                                </span>{' '}
                                <span className="text-muted-foreground">
                                  · {b.paymentStatus} · {b.attendanceStatus}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="xs"
                                  variant={b.attendanceStatus === 'ATTENDED' ? 'default' : 'outline'}
                                  disabled={rowBusy[b.id]}
                                  onClick={() =>
                                    void setAttendance(e.id, b.id, 'ATTENDED')
                                  }
                                >
                                  Attended
                                </Button>
                                <Button
                                  size="xs"
                                  variant={b.attendanceStatus === 'NO_SHOW' ? 'destructive' : 'outline'}
                                  disabled={rowBusy[b.id]}
                                  onClick={() =>
                                    void setAttendance(e.id, b.id, 'NO_SHOW')
                                  }
                                >
                                  No-show
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </main>
  );
}

function EventForm({
  initial,
  cafes,
  busy,
  onSave,
  onCancel,
}: {
  initial: FormState;
  cafes: Cafe[];
  busy: boolean;
  onSave: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Card className="mb-6 rounded-3xl shadow-soft">
      <CardHeader className="pb-2">
        <p className="eyebrow text-primary">{initial.startAt ? 'Editing' : 'New event'}</p>
        <CardTitle className="font-heading font-bold tracking-tight">
          {initial.startAt ? 'Edit event' : 'Add an event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            onSave(form);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-cafe">Cafe</Label>
              <select
                id="e-cafe"
                required
                className={selectCls}
                value={form.cafeId}
                onChange={set('cafeId')}
              >
                <option value="" disabled>
                  Select a cafe…
                </option>
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.area}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-title">Title</Label>
              <Input id="e-title" value={form.title} onChange={set('title')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-start">Starts at</Label>
              <Input
                id="e-start"
                type="datetime-local"
                required
                value={form.startAt}
                onChange={set('startAt')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-track">Gender track</Label>
              <select
                id="e-track"
                className={selectCls}
                value={form.genderTrack}
                onChange={set('genderTrack')}
              >
                <option value="MIXED">Mixed</option>
                <option value="WOMEN_ONLY">Women only</option>
                <option value="MEN_ONLY">Men only</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-area">Area</Label>
              <Input id="e-area" required value={form.area} onChange={set('area')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-cap">Capacity</Label>
              <Input
                id="e-cap"
                type="number"
                min={1}
                required
                value={form.capacity}
                onChange={set('capacity')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-price">Price (PKR)</Label>
              <Input
                id="e-price"
                type="number"
                min={0}
                required
                value={form.pricePKR}
                onChange={set('pricePKR')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-venue" className="text-muted-foreground text-xs font-normal">
                Venue override (optional)
              </Label>
              <Input id="e-venue" value={form.venueName} onChange={set('venueName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-vaddr" className="text-muted-foreground text-xs font-normal">
                Venue address (optional)
              </Label>
              <Input id="e-vaddr" value={form.venueAddress} onChange={set('venueAddress')} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
