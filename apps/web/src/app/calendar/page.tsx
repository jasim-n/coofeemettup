'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type TableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PageLoader } from '@/components/spinner';
import { CategoryPills } from '@/components/category-pills';

/* ─── module-level NOW (same pattern as meetups/page.tsx) ────────── */
const NOW = Date.now();

/* ─── helpers ────────────────────────────────────────────────────── */

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function tablesForDay(tables: TableDto[], year: number, month: number, day: number): TableDto[] {
  return tables.filter((t) => {
    const d = new Date(t.startAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

/* ─── calendar page ──────────────────────────────────────────────── */

export default function CalendarPage() {
  const { user, loading } = useAuth();

  const [joined, setJoined] = useState<TableDto[]>([]);
  const [hosted, setHosted] = useState<TableDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  // viewed month state — initialised from NOW once
  const [viewYear, setViewYear] = useState(() => new Date(NOW).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(NOW).getMonth()); // 0-indexed

  // selected day for detail list
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      if (active) setFetching(true);
      try {
        const [j, h] = await Promise.all([api.myJoinedTables(), api.myHostedTables()]);
        if (active) {
          setJoined(j);
          setHosted(h);
        }
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load calendar');
      } finally {
        if (active) setFetching(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading || (user && fetching)) return <PageLoader />;

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 py-6 sm:px-6">
        <p className="text-sm">
          Please{' '}
          <Link href="/login" className="underline">
            sign in
          </Link>{' '}
          to view your calendar.
        </p>
      </main>
    );
  }

  /* ── calendar math ──────────────────────────────────────────────── */
  const today = new Date(NOW);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rawFirst = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const blanks = rawFirst === 0 ? 6 : rawFirst - 1; // Mon-based grid
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  });

  // deduplicated tables (joined + hosted, no dupes by id)
  const allTables = [...joined];
  const hostedIds = new Set(joined.map((t) => t.id));
  for (const t of hosted) {
    if (!hostedIds.has(t.id)) allTables.push(t);
  }

  function hasMeetup(day: number): boolean {
    return allTables.some((t) => {
      const d = new Date(t.startAt);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    });
  }

  function prevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const dayMeetups =
    selectedDay !== null ? tablesForDay(allTables, viewYear, viewMonth, selectedDay) : [];

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 py-6 sm:px-6">
      {/* header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-extrabold tracking-tight">My Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your joined and hosted meetups at a glance.
          </p>
        </div>
        <Link
          href="/meetups"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          <i className="fa-solid fa-arrow-left" />
          Back to Meetups
        </Link>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── CALENDAR GRID ─────────────────────────────────────────── */}
        <div className="bg-card shadow-soft rounded-3xl border p-6">
          {/* month nav */}
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors"
              aria-label="Previous month"
            >
              <i className="fa-solid fa-chevron-left text-sm" />
            </button>
            <p className="font-heading text-lg font-bold tracking-tight">{monthLabel}</p>
            <button
              type="button"
              onClick={nextMonth}
              className="hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors"
              aria-label="Next month"
            >
              <i className="fa-solid fa-chevron-right text-sm" />
            </button>
          </div>

          {/* day-of-week headers */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d} className="text-muted-foreground pb-2 text-xs font-semibold">
                {d}
              </span>
            ))}

            {/* blank cells */}
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`b${i}`} />
            ))}

            {/* day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = isSameDay(new Date(viewYear, viewMonth, day), today);
              const isSelected = selectedDay === day;
              const hasDot = hasMeetup(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative mx-auto flex size-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold ring-2 ring-primary/30'
                      : isToday
                        ? 'bg-primary/15 text-primary font-bold'
                        : hasDot
                          ? 'hover:bg-muted cursor-pointer font-semibold'
                          : 'hover:bg-muted cursor-pointer text-foreground'
                  }`}
                  aria-label={`${day} ${monthLabel}${hasDot ? ', has meetups' : ''}`}
                >
                  {day}
                  {hasDot && !isSelected && (
                    <span className="bg-primary absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* legend */}
          <div className="mt-5 flex items-center gap-4 border-t pt-4">
            <div className="flex items-center gap-1.5">
              <span className="bg-primary/15 inline-block size-4 rounded-full" />
              <span className="text-muted-foreground text-xs">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative inline-block size-4">
                <span className="bg-primary absolute bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full" />
              </span>
              <span className="text-muted-foreground text-xs">Has meetup</span>
            </div>
          </div>
        </div>

        {/* ── DAY DETAIL / SUMMARY ──────────────────────────────────── */}
        <div className="space-y-4">
          {selectedDay !== null ? (
            <div className="bg-card shadow-soft rounded-3xl border p-6">
              <h2 className="font-heading mb-4 text-lg font-bold tracking-tight">
                {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('en-PK', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>

              {dayMeetups.length === 0 ? (
                <div className="rounded-2xl border border-dashed py-8 text-center">
                  <i className="fa-solid fa-calendar-day text-muted-foreground text-2xl" />
                  <p className="text-muted-foreground mt-2 text-sm">No meetups on this day.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {dayMeetups.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tables/${t.id}`}
                        className="hover:bg-muted -mx-2 flex items-start gap-3 rounded-2xl px-2 py-3 transition-colors"
                      >
                        {/* teal time strip */}
                        <div className="bg-primary/10 flex w-14 shrink-0 flex-col items-center rounded-xl py-2">
                          <span className="text-primary text-xs font-bold">
                            {new Date(t.startAt).toLocaleTimeString('en-PK', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-heading truncate text-sm font-bold">
                            {t.title ?? t.category}
                          </p>
                          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
                            <i className="fa-solid fa-location-dot" />
                            {t.venueName ?? t.cafe?.name ?? 'See map'}
                          </p>
                          <CategoryPills
                            category={t.category}
                            variant="muted"
                            max={3}
                            className="mt-0.5"
                          />
                          {t.myRequestStatus && (
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                t.myRequestStatus === 'APPROVED'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                              }`}
                            >
                              {t.myRequestStatus === 'APPROVED' ? 'Confirmed' : 'Pending'}
                            </span>
                          )}
                        </div>

                        <i className="fa-solid fa-chevron-right text-muted-foreground mt-1 shrink-0 text-xs" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            /* default: upcoming meetups summary */
            <div className="bg-card shadow-soft rounded-3xl border p-6">
              <h2 className="font-heading mb-4 text-lg font-bold tracking-tight">
                Upcoming Meetups
              </h2>

              {(() => {
                const upcoming = allTables
                  .filter((t) => new Date(t.startAt).getTime() >= NOW)
                  .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                  .slice(0, 8);

                if (upcoming.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed py-8 text-center">
                      <i className="fa-solid fa-mug-hot text-muted-foreground text-2xl" />
                      <p className="text-muted-foreground mt-2 text-sm">
                        No upcoming meetups. Click a day with a dot to see details.
                      </p>
                    </div>
                  );
                }

                return (
                  <ul className="space-y-3">
                    {upcoming.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/tables/${t.id}`}
                          className="hover:bg-muted -mx-2 flex items-start gap-3 rounded-2xl px-2 py-3 transition-colors"
                        >
                          <div className="bg-primary/10 flex w-14 shrink-0 flex-col items-center rounded-xl py-2">
                            <span className="text-primary text-[10px] font-bold">
                              {new Date(t.startAt).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-heading truncate text-sm font-bold">
                              {t.title ?? t.category}
                            </p>
                            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
                              <i className="fa-solid fa-location-dot" />
                              {t.venueName ?? t.cafe?.name ?? 'See map'}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {formatDateTime(t.startAt)}
                            </p>
                          </div>

                          <i className="fa-solid fa-chevron-right text-muted-foreground mt-1 shrink-0 text-xs" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          )}

          {/* stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card shadow-soft rounded-2xl border p-4 text-center">
              <p className="text-primary font-heading text-2xl font-extrabold">
                {joined.filter((t) => new Date(t.startAt).getTime() >= NOW).length}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs font-semibold">Upcoming Joined</p>
            </div>
            <div className="bg-card shadow-soft rounded-2xl border p-4 text-center">
              <p className="text-primary font-heading text-2xl font-extrabold">
                {hosted.filter((t) => new Date(t.startAt).getTime() >= NOW).length}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs font-semibold">Hosting</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
