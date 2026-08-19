'use client';

import { useEffect, useState } from 'react';
import type { InterestMixDto, PublicUser } from '@jrst/api-client';
import { api } from '@/lib/api';
import { showFutureTasks } from '@/lib/future-tasks';

/**
 * Flag-gated future preferences + interest mix.
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
        if (active) setMix({ totalTables: 0, segments: [] });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

  return (
    <section className="bg-card shadow-soft space-y-6 rounded-3xl border p-6">
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

      {/* Interest mix */}
      <div>
        <h3 className="text-sm font-semibold">Your interest mix</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          From tables you&apos;ve joined or hosted — private to you.
        </p>
        {!mix || mix.segments.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Join or host a few tables and a mix will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mix.segments.map((s) => (
              <li key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">
                    {s.percent}% · {s.count}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width]"
                    style={{ width: `${Math.min(100, s.percent)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {mix && mix.totalTables > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            Based on {mix.totalTables} table
            {mix.totalTables === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3 border-t pt-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--primary)]"
            checked={surprise}
            disabled={busy === 'surpriseMeOptIn'}
            onChange={(e) => {
              void savePref('surpriseMeOptIn', e.target.checked);
            }}
          />
          <span>
            <span className="block text-sm font-semibold">Surprise me</span>
            <span className="text-muted-foreground text-xs">
              Opt in to occasional curated tables matched to how you show up.
              You can always decline an invite.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--primary)]"
            checked={remind}
            disabled={busy === 'remindBeforeMeetup'}
            onChange={(e) => {
              void savePref('remindBeforeMeetup', e.target.checked);
            }}
          />
          <span>
            <span className="block text-sm font-semibold">
              Remind me the day before
            </span>
            <span className="text-muted-foreground text-xs">
              Preference saved now; reminder emails land in a later pass.
            </span>
          </span>
        </label>
        {msg && <p className="text-muted-foreground text-xs">{msg}</p>}
      </div>

      {/* Stubs — no behavior */}
      <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
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
            className="bg-muted/40 rounded-2xl border border-dashed p-3"
          >
            <p className="text-xs font-semibold">{c.title}</p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
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
