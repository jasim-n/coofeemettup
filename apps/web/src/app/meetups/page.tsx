'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ApiError, type InviteDto, type TableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime, formatPKR } from '@/lib/format';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { PageLoader } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaveButton } from '@/components/save-button';
import { categoryIcon } from '@/lib/category-icon';

/* ─── helpers ───────────────────────────────────────────────────── */

const personName = (u: { firstName?: string | null; lastInitial?: string | null }) =>
  `${u.firstName ?? 'Member'} ${u.lastInitial ?? ''}`.trim();

const NOW = Date.now();

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date(NOW);
  const tomorrow = new Date(NOW);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

type WhenFilter = 'all' | 'upcoming' | 'week' | 'weekend' | 'past';
type TabId = 'upcoming' | 'my' | 'invitations' | 'past' | 'saved';

function applyFilters(
  tables: TableDto[],
  when: WhenFilter,
  category: string,
  fromDate: string,
): TableDto[] {
  return tables.filter((t) => {
    const start = new Date(t.startAt).getTime();
    const now = NOW;

    // when filter
    if (when === 'upcoming' && start < now) return false;
    if (when === 'past' && start >= now) return false;
    if (when === 'week') {
      if (start < now || start > now + 7 * 86400_000) return false;
    }
    if (when === 'weekend') {
      if (start < now) return false;
      const day = new Date(start).getDay();
      if (day !== 0 && day !== 6) return false;
    }

    // category filter
    if (category && t.category !== category) return false;

    // date filter
    if (fromDate) {
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      if (start < from) return false;
    }

    return true;
  });
}

/* ─── calendar ──────────────────────────────────────────────────── */

function CalendarCard({ joined }: { joined: TableDto[] }) {
  const today = new Date(NOW);
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthLabel = today.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday=1…Sunday=0 → we want Mon=0…Sun=6
  const rawFirst = new Date(year, month, 1).getDay();
  const blanks = rawFirst === 0 ? 6 : rawFirst - 1;

  const meetupDays = new Set(
    joined.map((t) => {
      const d = new Date(t.startAt);
      return d.getFullYear() === year && d.getMonth() === month ? d.getDate() : -1;
    }),
  );

  return (
    <div className="bg-card shadow-soft rounded-3xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-heading font-bold tracking-tight">Calendar</p>
        <Link href="/calendar" className="text-muted-foreground text-xs hover:underline">
          View full calendar
        </Link>
      </div>
      <p className="text-muted-foreground mb-3 text-xs font-semibold">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d} className="text-muted-foreground pb-1 text-[10px] font-semibold">
            {d}
          </span>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate();
          const hasMeetup = meetupDays.has(day);
          return (
            <span
              key={day}
              className={`relative mx-auto flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                isToday
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'hover:bg-muted cursor-default'
              }`}
            >
              {day}
              {hasMeetup && !isToday && (
                <span className="bg-primary absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full" />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── meetup cover card ─────────────────────────────────────────── */

function MeetupCoverCard({ t }: { t: TableDto }) {
  const filled = t.seats - t.seatsLeft;
  return (
    <Link
      href={`/tables/${t.id}`}
      className="bg-card shadow-soft ring-border/60 group block overflow-hidden rounded-3xl ring-1 transition-all hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="relative h-36">
        <Cover
          category={t.category}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* day badge */}
        <span className="glass absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20">
          {dayLabel(t.startAt)}
        </span>
        {/* heart */}
        <SaveButton tableId={t.id} saved={t.saved} className="absolute right-3 top-3" />
      </div>
      <div className="p-4">
        <p className="text-muted-foreground mb-0.5 text-xs font-semibold">
          <i className={`fa-solid ${categoryIcon(t.category)} mr-1`} />
          {t.category}
        </p>
        <h3 className="font-heading truncate text-sm font-bold tracking-tight">
          {t.title ?? t.category}
        </h3>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          <i className="fa-solid fa-location-dot mr-1" />
          {t.venueName ?? t.cafe?.name ?? 'See map'}
        </p>
        {/* avatar stack */}
        <div className="mt-2 flex items-center gap-2">
          <Avatar name={t.host?.firstName ?? 'H'} size={22} />
          <span className="text-muted-foreground text-xs">+{filled}</span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          <i className="fa-solid fa-calendar-day mr-1" />
          {formatDateTime(t.startAt)}
        </p>
        <p className="text-muted-foreground text-xs">
          <i className="fa-solid fa-chair mr-1" />
          {t.seatsLeft} seats left
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-heading text-primary text-sm font-extrabold">
            {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
          </span>
          <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold transition-[filter] group-hover:brightness-110">
            Join
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── my meetups table row ──────────────────────────────────────── */

function MeetupTableRow({ t }: { t: TableDto }) {
  const approved = t.myRequestStatus === 'APPROVED';
  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <div className="ring-border/40 h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1">
            <Cover category={t.category} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="font-heading truncate text-sm font-bold">
              {t.title ?? t.category}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {t.venueName ?? t.cafe?.name ?? 'See map'}
            </p>
          </div>
        </div>
      </td>
      <td className="text-muted-foreground py-3 pr-4 text-xs whitespace-nowrap">
        {formatDateTime(t.startAt)}
      </td>
      <td className="text-muted-foreground py-3 pr-4 text-xs whitespace-nowrap">
        {t.venueName ?? t.cafe?.name ?? '—'}
      </td>
      <td className="py-3 pr-4">
        <Badge variant={approved ? 'success' : 'warning'}>
          {approved ? 'Confirmed' : 'Pending'}
        </Badge>
      </td>
      <td className="py-3">
        <Link
          href={`/tables/${t.id}`}
          className="border-border text-foreground hover:border-primary/40 hover:bg-muted rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        >
          Manage
        </Link>
      </td>
    </tr>
  );
}

function MeetupTable({ rows, emptyMsg }: { rows: TableDto[]; emptyMsg: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed py-10 text-center">
        <p className="text-muted-foreground text-sm">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="bg-card shadow-soft rounded-3xl border p-5">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border/60 border-b">
              {['Meetup', 'Date & Time', 'Location', 'Status', 'Action'].map((h) => (
                <th
                  key={h}
                  className="text-muted-foreground pb-2 pr-4 text-left text-xs font-semibold last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <MeetupTableRow key={t.id} t={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── suggested row ─────────────────────────────────────────────── */

function SuggestedRow({ t }: { t: TableDto }) {
  return (
    <Link
      href={`/tables/${t.id}`}
      className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors"
    >
      <div className="ring-border/40 h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1">
        <Cover category={t.category} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading truncate text-sm font-bold">
          {t.title ?? t.category}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          <i className="fa-solid fa-location-dot mr-1" />
          {t.venueName ?? t.cafe?.name ?? 'See map'}
        </p>
        <p className="text-muted-foreground truncate text-xs">{formatDateTime(t.startAt)}</p>
        <p className="font-heading text-primary text-xs font-bold">
          {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
        </p>
      </div>
      <SaveButton tableId={t.id} saved={t.saved} className="shrink-0" />
    </Link>
  );
}

/* ─── tabs ──────────────────────────────────────────────────────── */

// TABS is derived inside the component to get the live invite count.

/* ─── main page ─────────────────────────────────────────────────── */

export default function MeetupsPage() {
  const { user, loading } = useAuth();

  const [browse, setBrowse] = useState<TableDto[]>([]);
  const [joined, setJoined] = useState<TableDto[]>([]);
  const [invites, setInvites] = useState<InviteDto[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [when, setWhen] = useState<WhenFilter>('upcoming');
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState('');

  // tabs
  const [tab, setTab] = useState<TabId>('upcoming');

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [b, j] = await Promise.all([api.browseTables(), api.myJoinedTables()]);
        if (active) {
          setBrowse(b);
          setJoined(j);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load meetups');
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const data = await api.myInvites();
        if (active) setInvites(data);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const categories = useMemo(
    () => [...new Set([...browse, ...joined].map((t) => t.category))],
    [browse, joined],
  );

  // filtered subsets
  const filteredBrowse = useMemo(
    () => applyFilters(browse, when, category, fromDate),
    [browse, when, category, fromDate],
  );

  const upcomingCards = useMemo(
    () => filteredBrowse.filter((t) => new Date(t.startAt).getTime() >= NOW).slice(0, 4),
    [filteredBrowse],
  );

  const activeJoined = useMemo(
    () =>
      applyFilters(
        joined.filter(
          (t) => t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING',
        ),
        when,
        category,
        fromDate,
      ),
    [joined, when, category, fromDate],
  );

  const pastJoined = useMemo(
    () =>
      joined.filter(
        (t) =>
          new Date(t.startAt).getTime() < NOW &&
          (t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING'),
      ),
    [joined],
  );

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please{' '}
        <Link href="/login" className="underline">
          sign in
        </Link>{' '}
        first.
      </main>
    );

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'my', label: 'My Meetups' },
    { id: 'invitations', label: 'Invitations', badge: invites.length },
    { id: 'past', label: 'Past' },
    { id: 'saved', label: 'Saved' },
  ];

  function clearFilters() {
    setWhen('all');
    setCategory('');
    setFromDate('');
  }

  async function handleInviteAction(
    id: string,
    action: 'accept' | 'maybe',
  ) {
    setInviteBusy(id);
    try {
      if (action === 'accept') await api.acceptInvite(id);
      else await api.maybeInvite(id);
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      /* best-effort */
    } finally {
      setInviteBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 py-6 sm:px-6">
      {error && (
        <p className="text-destructive mb-4 text-sm">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_320px]">
        {/* ── LEFT RAIL ──────────────────────────────────────────── */}
        <aside className="bg-card shadow-soft rounded-3xl border p-5 lg:sticky lg:top-24 lg:self-start">
          {/* Filters heading */}
          <div className="mb-4 flex items-center justify-between">
            <p className="font-heading font-bold tracking-tight">Filters</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary text-xs font-semibold hover:underline"
            >
              Clear all
            </button>
          </div>

          {/* WHEN */}
          <div className="mb-5">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              When
            </p>
            <ul className="space-y-1">
              {(
                [
                  { id: 'all', label: 'All Meetups' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'week', label: 'This Week' },
                  { id: 'weekend', label: 'This Weekend' },
                  { id: 'past', label: 'Past' },
                ] as { id: WhenFilter; label: string }[]
              ).map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => setWhen(opt.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                      when === opt.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span
                      className={`inline-block size-3.5 rounded-full border-2 ${
                        when === opt.id
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40'
                      }`}
                    />
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* DATE RANGE */}
          <div className="mb-5">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Date Range
            </p>
            <label className="text-muted-foreground block text-xs">Select date range</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-border focus:ring-primary mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
          </div>

          {/* CATEGORY */}
          <div className="mb-5">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Category
            </p>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setCategory('')}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    category === ''
                      ? 'bg-secondary text-primary font-semibold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <i className="fa-solid fa-th-large w-4 text-center" />
                  All Categories
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                      category === cat
                        ? 'bg-secondary text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <i className={`fa-solid ${categoryIcon(cat)} w-4 text-center`} />
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* LOCATION */}
          <div className="mb-5">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Location
            </p>
            <input
              type="text"
              placeholder="Search area…"
              className="border-border focus:ring-primary w-full rounded-xl border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Distance</span>
                <span className="font-semibold">25 km</span>
              </div>
              <input type="range" min={0} max={50} defaultValue={25} className="accent-primary w-full" />
            </div>
          </div>

          {/* Apply button (live filter → decorative) */}
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:brightness-110 w-full rounded-full py-2.5 text-sm font-semibold transition-[filter]"
          >
            Apply Filters
          </button>
        </aside>

        {/* ── MAIN COLUMN ────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {/* header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="display text-3xl font-extrabold tracking-tight">Meetups</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Discover, join and manage your coffee conversations.
              </p>
            </div>
            <Link
              href="/tables/new"
              className="bg-primary text-primary-foreground hover:brightness-110 hover:shadow-glow hover:-translate-y-0.5 shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold shadow-soft transition-all"
            >
              + Create Meetup
            </Link>
          </div>

          {/* tabs */}
          <div className="border-border/60 flex border-b">
            {TABS.map(({ id, label, badge }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`-mb-px flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tab === id
                    ? 'text-primary border-primary border-b-2'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
                {badge !== undefined && (
                  <span className="bg-secondary text-secondary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── UPCOMING TAB ─────────────────────────────────────── */}
          {tab === 'upcoming' && (
            <div className="space-y-8">
              {/* cover grid */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold tracking-tight">
                    Upcoming Meetups
                  </h2>
                  <Link href="/discover" className="text-primary text-sm font-semibold hover:underline">
                    View all →
                  </Link>
                </div>
                {upcomingCards.length === 0 ? (
                  <div className="rounded-3xl border border-dashed py-12 text-center">
                    <i className="fa-solid fa-chair text-muted-foreground text-3xl" />
                    <p className="text-muted-foreground mt-2 text-sm">
                      No upcoming meetups match your filters.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {upcomingCards.map((t) => (
                      <MeetupCoverCard key={t.id} t={t} />
                    ))}
                  </div>
                )}
              </section>

              {/* my meetups mini-table */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold tracking-tight">My Meetups</h2>
                </div>
                <MeetupTable
                  rows={activeJoined}
                  emptyMsg="You haven't joined any meetups yet."
                />
                {activeJoined.length > 0 && (
                  <Link
                    href="/meetups"
                    className="text-primary mt-3 block text-sm font-semibold hover:underline"
                    onClick={() => setTab('my')}
                  >
                    View all my meetups →
                  </Link>
                )}
              </section>
            </div>
          )}

          {/* ── MY MEETUPS TAB ───────────────────────────────────── */}
          {tab === 'my' && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold tracking-tight">My Meetups</h2>
              <MeetupTable
                rows={activeJoined}
                emptyMsg="You haven't joined any meetups yet."
              />
            </div>
          )}

          {/* ── INVITATIONS TAB ──────────────────────────────────── */}
          {tab === 'invitations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold tracking-tight">Invitations</h2>
                <Link href="/invites" className="text-primary text-sm font-semibold hover:underline">
                  View all →
                </Link>
              </div>
              {invites.length === 0 ? (
                <div className="rounded-3xl border border-dashed py-16 text-center">
                  <i className="fa-regular fa-envelope-open text-muted-foreground mb-3 text-4xl" />
                  <p className="font-heading mt-2 font-bold">No invitations yet</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Invites to join tables will show here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {invites.map((inv) => (
                    <div key={inv.id} className="bg-card shadow-soft ring-border/60 overflow-hidden rounded-3xl ring-1">
                      <div className="relative h-32">
                        <Cover category={inv.table.category} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </div>
                      <div className="p-4 space-y-2">
                        <Link
                          href={`/tables/${inv.table.id}`}
                          className="font-heading block truncate text-sm font-bold tracking-tight hover:underline"
                        >
                          <i className={`fa-solid ${categoryIcon(inv.table.category)} mr-1`} />
                          {inv.table.title ?? inv.table.category}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          <i className="fa-solid fa-calendar-day mr-1" />
                          {formatDateTime(inv.table.startAt)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Avatar name={personName(inv.inviter)} size={18} />
                          <span className="text-muted-foreground text-xs">
                            Invited by <span className="text-foreground font-semibold">{personName(inv.inviter)}</span>
                          </span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="xs"
                            disabled={inviteBusy === inv.id}
                            onClick={() => void handleInviteAction(inv.id, 'accept')}
                            className="flex-1"
                          >
                            {inviteBusy === inv.id ? '…' : 'Accept'}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={inviteBusy === inv.id}
                            onClick={() => void handleInviteAction(inv.id, 'maybe')}
                          >
                            Maybe
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PAST TAB ─────────────────────────────────────────── */}
          {tab === 'past' && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold tracking-tight">Past Meetups</h2>
              <MeetupTable
                rows={pastJoined}
                emptyMsg="No past meetups yet."
              />
            </div>
          )}

          {/* ── SAVED TAB ────────────────────────────────────────── */}
          {tab === 'saved' && (
            <div className="rounded-3xl border border-dashed py-16 text-center">
              <i className="fa-solid fa-bookmark text-muted-foreground text-4xl" />
              <p className="font-heading mt-3 font-bold">No saved tables yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Tap the heart on any meetup to save it here.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT RAIL ─────────────────────────────────────────── */}
        <aside className="space-y-4">
          {/* Calendar */}
          <CalendarCard joined={joined} />

          {/* Suggested */}
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-heading font-bold tracking-tight">Suggested for you</p>
              <Link href="/discover" className="text-primary text-xs font-semibold hover:underline">
                See all
              </Link>
            </div>
            {browse.slice(0, 3).length === 0 ? (
              <p className="text-muted-foreground text-sm">No suggestions right now.</p>
            ) : (
              <div className="space-y-1">
                {browse.slice(0, 3).map((t) => (
                  <SuggestedRow key={t.id} t={t} />
                ))}
              </div>
            )}
          </div>

          {/* Your invitations */}
          <div className="bg-card shadow-soft rounded-3xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-heading font-bold tracking-tight">Your invitations</p>
              <Link href="/invites" className="text-primary text-xs font-semibold hover:underline">
                View all
              </Link>
            </div>
            {invites.length === 0 ? (
              <div className="rounded-2xl border border-dashed py-6 text-center">
                <p className="text-muted-foreground text-sm">No invitations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.slice(0, 2).map((inv) => (
                  <div key={inv.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="ring-border/40 h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1">
                        <Cover category={inv.table.category} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/tables/${inv.table.id}`}
                          className="font-heading block truncate text-xs font-bold hover:underline"
                        >
                          {inv.table.title ?? inv.table.category}
                        </Link>
                        <div className="flex items-center gap-1">
                          <Avatar name={personName(inv.inviter)} size={14} />
                          <span className="text-muted-foreground truncate text-[11px]">
                            {personName(inv.inviter)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="xs"
                        disabled={inviteBusy === inv.id}
                        onClick={() => void handleInviteAction(inv.id, 'accept')}
                        className="flex-1 text-[11px]"
                      >
                        {inviteBusy === inv.id ? '…' : 'Accept'}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={inviteBusy === inv.id}
                        onClick={() => void handleInviteAction(inv.id, 'maybe')}
                        className="text-[11px]"
                      >
                        Maybe
                      </Button>
                    </div>
                  </div>
                ))}
                {invites.length > 2 && (
                  <Link href="/invites" className="text-primary block text-center text-xs font-semibold hover:underline pt-1">
                    +{invites.length - 2} more →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Host your own meetup */}
          <div className="bg-secondary rounded-3xl p-5">
            <div className="mb-3 text-center text-4xl">
              <i className="fa-solid fa-mug-hot text-primary" />
            </div>
            <p className="font-heading text-secondary-foreground text-center font-bold tracking-tight">
              Host your own meetup
            </p>
            <p className="text-secondary-foreground/80 mt-2 text-center text-sm">
              Bring people together over coffee &amp; good conversations.
            </p>
            <Link
              href="/tables/new"
              className="bg-primary text-primary-foreground hover:brightness-110 mt-4 block rounded-full py-2.5 text-center text-sm font-semibold transition-[filter]"
            >
              Create Meetup
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
