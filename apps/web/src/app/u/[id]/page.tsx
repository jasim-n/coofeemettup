'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApiError,
  type PublicProfileDto,
  type UserReputation,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { ConnectButton } from '@/components/connect-button';
import { Stars } from '@/components/stars';
import { PageLoader } from '@/components/spinner';

/* ── helpers ─────────────────────────────────────────────────────── */

function formatJoinDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Replace underscores with spaces and Title Case each word. */
function humanize(v: string): string {
  return v
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── sub-components ──────────────────────────────────────────────── */

function StatTile({
  icon,
  value,
  label,
  sub,
}: {
  icon: string;
  value: string | number;
  label: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-card shadow-soft rounded-2xl border p-4 text-center">
      <span className="bg-primary/10 text-primary mx-auto grid size-9 place-items-center rounded-xl text-base">
        <i className={`fa-solid ${icon} text-xs`} />
      </span>
      <p className="font-heading mt-2 truncate text-sm font-extrabold tracking-tight">
        {value}
      </p>
      <p className="text-muted-foreground truncate text-xs">{label}</p>
      {sub && <div className="mt-0.5">{sub}</div>}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
      {label}
    </span>
  );
}

function RatingPill({
  label,
  avg,
  count,
}: {
  label: string;
  avg: number;
  count: number;
}) {
  return (
    <div className="bg-muted/50 rounded-2xl p-3 text-center">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      {count > 0 ? (
        <>
          <p className="font-heading text-2xl font-extrabold">{avg.toFixed(1)}</p>
          <div className="mt-0.5 flex justify-center">
            <Stars value={Math.round(avg)} size="text-xs" />
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {count} review{count === 1 ? '' : 's'}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">No ratings yet</p>
      )}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────── */

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [rep, setRep] = useState<UserReputation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [profileData, repData] = await Promise.all([
          api.publicProfile(id),
          api.userReviews(id),
        ]);
        if (!active) return;
        setProfile(profileData);
        setRep(repData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load profile');
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (error && !profile) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        This member&apos;s profile isn&apos;t available.
      </main>
    );
  }
  if (!profile) return <PageLoader />;

  const { user: p, stats, connectionState, isSelf } = profile;

  const displayName = `@${p.username ?? 'member'}`;
  const joinDate = formatJoinDate(p.createdAt);

  /* About card — show if any field present */
  const hasAbout = !!p.occupation || !!p.city || p.interests.length > 0;

  /* Vibe card — show if any field present */
  const vibeFields: { label: string; value: string }[] = [
    p.lifeStage ? { label: 'Life stage', value: humanize(p.lifeStage) } : null,
    p.socialEnergy ? { label: 'Social energy', value: humanize(p.socialEnergy) } : null,
    p.beveragePref ? { label: 'Prefers', value: humanize(p.beveragePref) } : null,
    p.language ? { label: 'Language', value: humanize(p.language) } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  const hasVibe = vibeFields.length > 0 || p.intents.length > 0;

  /* Reviews — score only; individual review text is never shown */
  const overall = rep?.overallRating;
  const overallDisplay =
    overall && overall.count > 0 ? overall.avg.toFixed(1) : '—';

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      <div className="space-y-6">

        {/* ── Hero band ─────────────────────────────────────────── */}
        <div className="bg-gradient-hero relative overflow-hidden rounded-3xl p-6 shadow-glow">
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full opacity-20 blur-3xl bg-primary/40"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="shrink-0">
              <Avatar name={p.username ?? 'member'} src={p.photoUrl} size={96} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="font-heading text-2xl font-extrabold leading-tight"
                  style={{ color: 'var(--ink-foreground, white)' }}
                >
                  {displayName}
                </h1>
                {p.verificationStatus === 'VERIFIED' && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: 'oklch(1 0 0 / 0.15)', color: 'white' }}
                  >
                    <i className="fa-solid fa-circle-check text-[10px]" /> Verified
                  </span>
                )}
                {p.canHost && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: 'oklch(1 0 0 / 0.15)', color: 'white' }}
                  >
                    <i className="fa-solid fa-mug-hot text-[10px]" /> Host
                  </span>
                )}
              </div>

              <p
                className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                style={{ color: 'oklch(1 0 0 / 0.65)' }}
              >
                {p.city && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-location-dot" /> {p.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-calendar" /> Joined {joinDate}
                </span>
              </p>
            </div>

            {/* Action row */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isSelf ? (
                <Link
                  href="/profile"
                  className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
                >
                  Edit profile
                </Link>
              ) : user ? (
                <>
                  <ConnectButton userId={id} initial={connectionState} />
                  <Link
                    href={`/messages?dm=${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
                  >
                    <i className="fa-solid fa-comment text-xs" /> Message
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Stat tiles ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile icon="fa-mug-hot" value={stats.hosted} label="Hosted" />
          <StatTile icon="fa-users" value={stats.joined} label="Joined" />
          <StatTile icon="fa-heart" value={stats.connections} label="Connections" />
          <StatTile icon="fa-bolt" value={p.reliabilityScore} label="Reliability" />
          <StatTile
            icon="fa-star"
            value={overallDisplay}
            label="Rating"
            sub={
              overall && overall.count > 0 ? (
                <p className="text-muted-foreground text-[10px]">
                  {overall.count} review{overall.count === 1 ? '' : 's'}
                </p>
              ) : undefined
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── About card ──────────────────────────────────────── */}
          {hasAbout && (
            <section className="bg-card shadow-soft rounded-3xl border p-6 space-y-4">
              <h2 className="font-heading text-base font-bold tracking-tight">About</h2>
              {p.occupation && (
                <div className="flex items-center gap-2 text-sm">
                  <i className="fa-solid fa-briefcase text-muted-foreground text-xs w-4 text-center" />
                  <span>{p.occupation}</span>
                </div>
              )}
              {p.city && (
                <div className="flex items-center gap-2 text-sm">
                  <i className="fa-solid fa-location-dot text-muted-foreground text-xs w-4 text-center" />
                  <span>{p.city}</span>
                </div>
              )}
              {p.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {p.interests.map((interest) => (
                    <Chip key={interest} label={interest} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Vibe card ───────────────────────────────────────── */}
          {hasVibe && (
            <section className="bg-card shadow-soft rounded-3xl border p-6 space-y-4">
              <h2 className="font-heading text-base font-bold tracking-tight">Vibe</h2>
              {vibeFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {vibeFields.map(({ label, value }) => (
                    <span
                      key={label}
                      className="inline-flex flex-col items-start rounded-2xl bg-secondary px-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">
                        {label}
                      </span>
                      <span className="font-semibold text-secondary-foreground">{value}</span>
                    </span>
                  ))}
                </div>
              )}
              {p.intents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {p.intents.map((intent) => (
                    <Chip key={intent} label={humanize(intent)} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Reviews card (scores only) ────────────────────────── */}
        <section className="bg-card shadow-soft rounded-3xl border p-6 space-y-4">
          <h2 className="font-heading text-base font-bold tracking-tight">Rating</h2>

          {rep && overall && overall.count > 0 ? (
            <>
              <RatingPill label="Overall" avg={overall.avg} count={overall.count} />
              <div className="grid grid-cols-2 gap-3">
                <RatingPill
                  label="As host"
                  avg={rep.hostRating.avg}
                  count={rep.hostRating.count}
                />
                <RatingPill
                  label="As guest"
                  avg={rep.guestRating.avg}
                  count={rep.guestRating.count}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Individual reviews stay private. Only calculated scores are shown.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No ratings yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
