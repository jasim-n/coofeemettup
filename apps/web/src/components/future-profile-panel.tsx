'use client';

import { useEffect, useState } from 'react';
import type { InterestMixDto, PublicUser } from '@jrst/api-client';
import { api } from '@/lib/api';
import { showFutureTasks } from '@/lib/future-tasks';

function RadarChart({
  axes,
}: {
  axes: { key: string; label: string; value: number }[];
}) {
  const n = axes.length;
  if (n < 3) return null;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 78;

  const point = (i: number, value: number) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const r = (Math.min(100, Math.max(0, value)) / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  };

  const ring = (pct: number) =>
    axes
      .map((_, i) => {
        const [x, y] = point(i, pct);
        return `${x},${y}`;
      })
      .join(' ');

  const poly = axes
    .map((a, i) => {
      const [x, y] = point(i, a.value);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-44 w-44 max-w-full shrink-0 sm:h-52 sm:w-52"
      role="img"
      aria-label="Interest mix radar"
    >
      {[25, 50, 75, 100].map((pct) => (
        <polygon
          key={pct}
          points={ring(pct)}
          fill="none"
          className="stroke-border"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={poly}
        className="fill-primary/25 stroke-primary"
        strokeWidth={2}
      />
      {axes.map((a, i) => {
        const [x, y] = point(i, 112);
        return (
          <text
            key={a.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-[9px] font-semibold"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * Flag-gated future preferences + interest mix graph.
 * Mount only when showFutureTasks() is true (NEXT_PUBLIC_FUTURE_TASKS=false).
 */
export function FutureProfilePanel({
  user,
  onSaved,
}: {
  user: PublicUser;
  onSaved: () => Promise<void> | void;
}) {
  const [mix, setMix] = useState<InterestMixDto | null>(null);
  const [pending, setPending] = useState<{
    surpriseMeOptIn?: boolean;
    remindBeforeMeetup?: boolean;
  }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const surprise =
    pending.surpriseMeOptIn ?? Boolean(user.surpriseMeOptIn);
  const remind =
    pending.remindBeforeMeetup ?? Boolean(user.remindBeforeMeetup);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await api.myInterestMix();
        if (active) setMix(data);
      } catch {
        if (active) {
          setMix({
            totalTables: 0,
            hostedCount: 0,
            joinedCount: 0,
            segments: [],
            axes: [],
            reviews: {
              overallAvg: null,
              overallCount: 0,
              asHostAvg: null,
              asHostCount: 0,
              asGuestAvg: null,
              asGuestCount: 0,
            },
            reliabilityScore: user.reliabilityScore ?? 100,
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [user.reliabilityScore]);

  async function savePref(
    key: 'surpriseMeOptIn' | 'remindBeforeMeetup',
    value: boolean,
  ) {
    setBusy(key);
    setMsg(null);
    setPending((p) => ({ ...p, [key]: value }));
    try {
      await api.updateProfile({ [key]: value });
      await onSaved();
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
      setMsg('Saved');
    } catch {
      setMsg('Could not save — try again');
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    } finally {
      setBusy(null);
    }
  }

  if (!showFutureTasks()) return null;

  const hasGraph = Boolean(mix && mix.axes.length >= 3);

  return (
    <section className="bg-card shadow-soft min-w-0 space-y-6 overflow-hidden rounded-3xl border p-4 sm:p-6">
      <div>
        <p className="eyebrow text-primary mb-1">Future labs</p>
        <h2 className="font-heading text-lg font-bold tracking-tight">
          Coming preferences
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Preview features. Hidden in production while{' '}
          <code className="text-xs">FUTURE_TASKS</code> stays on.
        </p>
      </div>

      {/* Interest mix graph */}
      <div data-testid="interest-mix">
        <h3 className="text-sm font-semibold">Your interest mix</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Private snapshot from tables, interests, reliability, and peer
          ratings — used later for Surprise Me.
        </p>

        {hasGraph && mix ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <RadarChart axes={mix.axes} />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-2xl p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Reliability
                  </p>
                  <p className="font-heading text-xl font-extrabold">
                    {mix.reliabilityScore}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-2xl p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Peer rating
                  </p>
                  <p className="font-heading text-xl font-extrabold">
                    {mix.reviews.overallAvg != null
                      ? mix.reviews.overallAvg.toFixed(1)
                      : '—'}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {mix.reviews.overallCount} review
                    {mix.reviews.overallCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-2xl p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    As host
                  </p>
                  <p className="font-heading text-lg font-bold">
                    {mix.reviews.asHostAvg != null
                      ? mix.reviews.asHostAvg.toFixed(1)
                      : '—'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-2xl p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    As guest
                  </p>
                  <p className="font-heading text-lg font-bold">
                    {mix.reviews.asGuestAvg != null
                      ? mix.reviews.asGuestAvg.toFixed(1)
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                {mix.totalTables === 0
                  ? 'Graph seeds from your profile interests & reliability until you join tables.'
                  : `Based on ${mix.totalTables} table${mix.totalTables === 1 ? '' : 's'} (${mix.hostedCount} hosted · ${mix.joinedCount} joined).`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            Loading your mix…
          </p>
        )}

        {mix && mix.segments.length > 0 && (
          <ul className="mt-4 space-y-2">
            {mix.segments.slice(0, 8).map((s) => (
              <li key={`${s.source ?? 'a'}-${s.label}`}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {s.label}
                    {s.source === 'declared' && (
                      <span className="text-muted-foreground ml-1 font-normal">
                        (stated)
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {s.percent}%
                    {s.count > 0 ? ` · ${s.count}` : ''}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      s.source === 'declared' ? 'bg-primary/40' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(s.percent, 4))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toggles */}
      <div className="min-w-0 space-y-3 border-t pt-4">
        <label className="flex min-w-0 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
            checked={surprise}
            disabled={busy === 'surpriseMeOptIn'}
            onChange={(e) => {
              void savePref('surpriseMeOptIn', e.target.checked);
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Surprise me</span>
            <span className="text-muted-foreground block text-xs leading-snug break-words">
              Opt in to occasional curated tables matched to how you show up.
              You can always decline an invite.
            </span>
          </span>
        </label>

        <label className="flex min-w-0 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
            checked={remind}
            disabled={busy === 'remindBeforeMeetup'}
            onChange={(e) => {
              void savePref('remindBeforeMeetup', e.target.checked);
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              Remind me the day before
            </span>
            <span className="text-muted-foreground block text-xs leading-snug break-words">
              Preference saved now; reminder emails land in a later pass.
            </span>
          </span>
        </label>
        {msg && <p className="text-muted-foreground text-xs">{msg}</p>}
      </div>

      {/* Stubs — no behavior */}
      <div className="grid min-w-0 gap-3 border-t pt-4 sm:grid-cols-3">
        {[
          {
            title: 'Host templates',
            body: 'Reuse a cafe + vibe for recurring tables.',
          },
          {
            title: 'Waitlist',
            body: 'Join a queue when a table is full.',
          },
          {
            title: 'No-show signal',
            body: 'Hosts mark gentle reliability after a meetup.',
          },
        ].map((c) => (
          <div
            key={c.title}
            className="bg-muted/40 min-w-0 rounded-2xl border border-dashed p-3"
          >
            <p className="text-xs font-semibold">{c.title}</p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-snug break-words">
              {c.body}
            </p>
            <p className="text-muted-foreground mt-2 text-[10px] font-medium uppercase tracking-wide">
              Coming soon
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
