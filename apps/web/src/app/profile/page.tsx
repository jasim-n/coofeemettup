'use client';
/* eslint-disable react-hooks/set-state-in-effect -- hydrating the form once from the async-loaded profile */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, Intent, type TableDto, type UserReputation, type UpdateProfileInput, type NotificationsResponse } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { peekCache, swrGet, tablesCacheKeys } from '@/lib/data-cache';
import { parseList, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MyReviews from '@/components/my-reviews';
import { PageLoader } from '@/components/spinner';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { FutureProfilePanel } from '@/components/future-profile-panel';

/* ─── constants ─────────────────────────────────────────────────── */

const selectClass =
  'h-10 rounded-full border border-input bg-card/60 px-4 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const INTENT_LABELS: Record<string, string> = {
  MAKE_FRIENDS: 'Make new friends',
  MEET_OUTSIDE_BUBBLE: 'Meet people outside my bubble',
  NETWORKING: 'Networking',
  NEW_TO_CITY: "I'm new to the city",
  PRACTICE_ENGLISH: 'Practice English',
};

const INTEREST_ICON: Record<string, string> = {
  Books: 'fa-book',
  Startups: 'fa-rocket',
  Networking: 'fa-handshake',
  Film: 'fa-film',
  Coffee: 'fa-mug-hot',
  Travel: 'fa-plane',
  Music: 'fa-music',
  Tech: 'fa-microchip',
  Food: 'fa-utensils',
  Sports: 'fa-futbol',
  Art: 'fa-palette',
  Politics: 'fa-landmark',
};

/* ─── section type ──────────────────────────────────────────────── */

type Section = 'overview' | 'settings' | 'reviews' | 'identity';

/* ─── helpers ───────────────────────────────────────────────────── */

function formatJoinDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const NOW = Date.now();

function ago(iso: string): string {
  const diff = NOW - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function splitScore(total: number): [number, number, number, number] {
  const base = Math.floor(total / 4);
  const rem = total - base * 4;
  return [base + (rem > 0 ? 1 : 0), base + (rem > 1 ? 1 : 0), base + (rem > 2 ? 1 : 0), base];
}

/* ─── ReliabilityGauge (original) ──────────────────────────────── */

function ReliabilityGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const deg = clampedScore * 3.6;
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: 88,
        height: 88,
        background: `conic-gradient(var(--primary) ${deg}deg, var(--muted) 0deg)`,
      }}
    >
      <div
        className="absolute flex flex-col items-center justify-center rounded-full bg-card"
        style={{ width: 64, height: 64 }}
      >
        <span className="font-heading text-xl font-extrabold leading-none">{clampedScore}</span>
        <span className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wide mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ─── IdentityCard (original, reusable) ─────────────────────────── */

function IdentityCard({
  verificationStatus,
  email,
  onCnicChange,
  cnicMsg,
}: {
  verificationStatus: string;
  email?: string | null;
  onCnicChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cnicMsg: string | null;
}) {
  const isVerified = verificationStatus === 'VERIFIED';
  const isPending = verificationStatus === 'PENDING';

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-4">
      <p className="eyebrow text-primary">Identity</p>

      {/* Phone — always verified (phone-auth) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-phone text-muted-foreground text-xs" />
          <span className="text-sm font-medium">Phone number</span>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          <span className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">✓</span>
          Verified
        </span>
      </div>

      <div className="h-px bg-border" />

      {/* Email — the account's login email (verified via email-OTP) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <i className="fa-solid fa-envelope text-muted-foreground text-xs" />
          <span className="truncate text-sm font-medium">{email || 'Email address'}</span>
        </div>
        {email ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
            <span className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">✓</span>
            Verified
          </span>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">Not added</span>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Government ID */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-id-card text-muted-foreground text-xs" />
          <span className="text-sm font-medium">Government ID</span>
        </div>
        {isVerified ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
            <span className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">✓</span>
            Verified
          </span>
        ) : isPending ? (
          <span className="text-xs font-semibold text-muted-foreground">Pending review</span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">Not submitted</span>
        )}
      </div>

      {!isVerified && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Upload a photo of your CNIC for review.</p>
          <input
            type="file"
            accept="image/*"
            onChange={onCnicChange}
            className="text-xs"
          />
        </div>
      )}
      {cnicMsg && <p className="text-xs text-green-600">{cnicMsg}</p>}
    </div>
  );
}

/* ─── MeetupCoverCard (profile context) ────────────────────────── */

function MeetupCoverCard({ t }: { t: TableDto }) {
  return (
    <Link
      href={`/tables/${t.id}`}
      className="bg-card shadow-soft ring-border/60 group block overflow-hidden rounded-3xl ring-1 transition-all hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="relative h-32">
        <Cover
          src={t.imageUrl ?? undefined}
          category={t.category}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="p-3">
        <p className="font-heading truncate text-sm font-bold">{t.title ?? t.category}</p>
        <p className="text-muted-foreground truncate text-xs"><i className="fa-solid fa-location-dot mr-1" />{t.venueName ?? t.cafe?.name ?? 'See map'}</p>
        <p className="text-muted-foreground text-xs"><i className="fa-solid fa-calendar-day mr-1" />{formatDateTime(t.startAt)}</p>
        <p className="text-muted-foreground text-xs">{t.seatsLeft} seats left</p>
      </div>
    </Link>
  );
}

/* ─── HostedMeetupRow ───────────────────────────────────────────── */

function HostedMeetupRow({ t }: { t: TableDto }) {
  const filled = t.seats - t.seatsLeft;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-border/40">
        <Cover src={t.imageUrl ?? undefined} category={t.category} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading truncate text-sm font-bold">{t.title ?? t.category}</p>
        <p className="text-muted-foreground truncate text-xs">
          <i className="fa-solid fa-location-dot mr-1" />{t.venueName ?? t.cafe?.name ?? 'See map'} · {formatDateTime(t.startAt)}
        </p>
        <p className="text-muted-foreground text-xs">{filled}/{t.seats} seats filled</p>
      </div>
      <Link
        href={`/tables/${t.id}`}
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary/40 hover:bg-muted transition-colors"
      >
        ⋮
      </Link>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();

  // Section state. Default 'overview' (SSR-safe — a useState initializer runs on
  // the server where window is undefined and is NOT re-run on hydration, so the
  // #code-of-conduct hash must be honoured in a client effect instead).
  const [section, setSection] = useState<Section>('overview');

  // Honour ?section=settings|edit deep-link (e.g. the home "Finish your profile" CTA).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('section');
    if (s === 'settings' || s === 'edit') setSection('settings');
  }, []);

  // Honour the #code-of-conduct deep-link from the table "Accept in profile" CTA:
  // open the settings section and scroll the consent checkbox into view.
  useEffect(() => {
    if (window.location.hash !== '#code-of-conduct') return;
    setSection('settings');
    const t = setTimeout(() => {
      document
        .getElementById('code-of-conduct')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // Form state
  const [form, setForm] = useState<Record<string, string>>({});
  const [intents, setIntents] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cnicMsg, setCnicMsg] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Stats (seed from shared tables cache when available)
  const seedKeys = tablesCacheKeys(user?.id);
  const seedHosted = peekCache<TableDto[]>(seedKeys.hosted);
  const seedJoined = peekCache<TableDto[]>(seedKeys.joined);
  const [myHostedTables, setMyHostedTables] = useState<TableDto[]>([]);
  const [myJoinedTables, setMyJoinedTables] = useState<TableDto[]>([]);
  const hostedView = myHostedTables.length > 0 ? myHostedTables : (seedHosted ?? []);
  const joinedView = myJoinedTables.length > 0 ? myJoinedTables : (seedJoined ?? []);
  const [myReviewsData, setMyReviewsData] = useState<UserReputation | null>(null);
  const [connectionsCount, setConnectionsCount] = useState<number | null>(null);

  // Notifications (for Activity Feed)
  const [notifications, setNotifications] = useState<NotificationsResponse>({ items: [], unread: 0 });

  // Tab for overview section
  const [overviewTab, setOverviewTab] = useState<'about' | 'achievements' | 'reviews' | 'activity'>('about');

  /* form hydration (original, deps [user]) */
  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      ageBand: user.ageBand ?? '',
      gender: user.gender ?? '',
      city: user.city ?? '',
      areas: user.areas.join(', '),
      language: user.language ?? '',
      availability: user.availability.join(', '),
      interests: user.interests.join(', '),
      lifeStage: user.lifeStage ?? '',
      socialEnergy: user.socialEnergy ?? '',
      occupation: user.occupation ?? '',
      newcomerStatus: user.newcomerStatus ?? '',
      beveragePref: user.beveragePref ?? '',
      accessibilityNeeds: user.accessibilityNeeds ?? '',
    });
    setIntents(user.intents);
    setPhoto(user.photoConsent);
    setConsent(Boolean(user.codeOfConductAt));
  }, [user]);

  /* stats useEffect (original) */
  useEffect(() => {
    if (!user) return;
    let active = true;
    const keys = tablesCacheKeys(user.id);
    void (async () => {
      try {
        const [hosted, joined, reviews, conns] = await Promise.all([
          user.canHost
            ? swrGet(keys.hosted, () => api.myHostedTables())
            : Promise.resolve([] as TableDto[]),
          swrGet(keys.joined, () => api.myJoinedTables()),
          api.myReviews() as Promise<UserReputation>,
          api.myConnections().catch(() => [] as import('@jrst/api-client').PublicUser[]),
        ]);
        if (!active) return;
        setMyHostedTables(hosted);
        setMyJoinedTables(joined);
        setMyReviewsData(reviews);
        setConnectionsCount(conns.length);
      } catch {
        // best-effort
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  /* notifications useEffect */
  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await api.notifications().catch(() => ({ items: [], unread: 0 } as NotificationsResponse));
      if (active) setNotifications(data);
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  /* derived — self sees own real name; handle is the public identity */
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    (user.username ? `@${user.username}` : 'Member');
  const joinDate = formatJoinDate(user.createdAt);
  // eslint-disable-next-line react-hooks/purity -- one-time clock read for filtering upcoming meetups
  const now = Date.now();
  const activeJoinedCount = joinedView.filter(
    (t) => t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING',
  ).length;
  const upcomingJoined = joinedView
    .filter(
      (t) =>
        (t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING') &&
        new Date(t.startAt).getTime() >= now,
    )
    .slice(0, 3);
  const avgRating =
    myReviewsData && (myReviewsData.overallRating?.count ?? myReviewsData.hostRating.count) > 0
      ? (myReviewsData.overallRating?.avg ?? myReviewsData.hostRating.avg).toFixed(1)
      : '—';
  const interestList = parseList(user.interests.join(', ')).filter(Boolean);
  const bioLine =
    interestList.length > 0
      ? `Coffee lover · ${interestList.slice(0, 2).join(' · ')}`
      : 'Here for good coffee and better conversations.';
  const [s1, s2, s3, s4] = splitScore(user.reliabilityScore);

  /* form helpers (original) */
  function field(key: string) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  const selectedDays = new Set(parseList(form.availability ?? ''));
  const toggleDay = (d: string) =>
    setForm((f) => {
      const set = new Set(parseList(f.availability ?? ''));
      if (set.has(d)) set.delete(d);
      else set.add(d);
      return { ...f, availability: DAYS.filter((x) => set.has(x)).join(', ') };
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormStatus(null);
    setBusy(true);
    const payload: UpdateProfileInput = {
      username: form.username || undefined,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      ageBand: form.ageBand || undefined,
      gender: (form.gender || undefined) as UpdateProfileInput['gender'],
      city: form.city || undefined,
      areas: parseList(form.areas ?? ''),
      language: (form.language || undefined) as UpdateProfileInput['language'],
      availability: parseList(form.availability ?? ''),
      interests: parseList(form.interests ?? ''),
      lifeStage: (form.lifeStage || undefined) as UpdateProfileInput['lifeStage'],
      socialEnergy: (form.socialEnergy || undefined) as UpdateProfileInput['socialEnergy'],
      occupation: form.occupation || undefined,
      intents: intents as UpdateProfileInput['intents'],
      newcomerStatus: form.newcomerStatus || undefined,
      beveragePref: (form.beveragePref || undefined) as UpdateProfileInput['beveragePref'],
      accessibilityNeeds: form.accessibilityNeeds || undefined,
      photoConsent: photo,
      agreeCodeOfConduct: consent || undefined,
    };
    try {
      await api.updateProfile(payload);
      await refresh();
      setFormStatus('Saved!');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleCnic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCnicMsg(null);
    try {
      await api.uploadCnic(file);
      await refresh();
      setCnicMsg('Submitted — pending review.');
    } catch (err) {
      setCnicMsg(err instanceof ApiError ? err.message : 'Upload failed');
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    // Client-side restrictions (backend enforces the same): images only, ≤5 MB.
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setPhotoError('Please choose a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setPhotoBusy(true);
    try {
      await api.uploadPhoto(file);
      await refresh();
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      e.target.value = '';
      setPhotoBusy(false);
    }
  }

  /* ── nav items ──────────────────────────────────────────────────── */

  const NAV_ITEMS: {
    id?: Section;
    href?: string;
    icon: string;
    label: string;
    shortLabel: string;
    tab?: typeof overviewTab;
  }[] = [
    { id: 'overview', icon: 'fa-user', label: 'Overview', shortLabel: 'Overview' },
    { href: '/meetups', icon: 'fa-calendar-days', label: 'My Meetups', shortLabel: 'Meetups' },
    { id: 'reviews', icon: 'fa-star', label: 'Reviews & Ratings', shortLabel: 'Reviews' },
    { href: '/saved', icon: 'fa-bookmark', label: 'Saved Tables', shortLabel: 'Saved' },
    { id: 'overview', icon: 'fa-clock-rotate-left', label: 'Activity', shortLabel: 'Activity', tab: 'activity' },
    { href: '/invites', icon: 'fa-envelope-open', label: 'Invitations', shortLabel: 'Invites' },
    { id: 'identity', icon: 'fa-shield-halved', label: 'Identity Verification', shortLabel: 'Verify' },
    { id: 'settings', icon: 'fa-gear', label: 'Account Settings', shortLabel: 'Settings' },
  ];


  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────── */

  return (
    <main className="mx-auto w-full max-w-[1508px] min-w-0 flex-1 px-4 sm:px-6 lg:px-12 py-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_1fr_320px]">

        {/* ══════════════════════════════════════════════════════════
            LEFT — Section nav (chips on top on mobile)
        ══════════════════════════════════════════════════════════ */}
        <aside className="order-1 min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Mini profile card */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft flex flex-col items-center gap-3 text-center max-lg:hidden">
            <Avatar name={displayName} src={user.photoUrl} size={64} online />
            <div>
              <p className="font-heading font-bold text-sm leading-tight flex items-center justify-center gap-1">
                {displayName}
                {user.verificationStatus === 'VERIFIED' && (
                  <i className="fa-solid fa-circle-check text-primary text-xs" title="Verified" />
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                {user.username ? `@${user.username}` : 'Set your handle'}
              </p>
              <p className="text-primary text-xs font-semibold mt-0.5">● Online</p>
            </div>
          </div>

          {/* Vertical nav — horizontal scroll chips on mobile */}
          <nav
            className="rounded-3xl border bg-card p-2 shadow-soft max-lg:-mx-1 max-lg:flex max-lg:gap-1 max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden lg:block"
            aria-label="Profile sections"
          >
            {NAV_ITEMS.map(({ id, href, icon, label, shortLabel, tab }) => {
              const active = (() => {
                if (href) return false;
                if (id === 'overview' && tab === 'activity') {
                  return section === 'overview' && overviewTab === 'activity';
                }
                if (id === 'overview') {
                  return section === 'overview' && overviewTab !== 'activity';
                }
                return id !== undefined && section === id;
              })();
              const cls = `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors max-lg:gap-1.5 max-lg:px-2.5 max-lg:text-xs lg:w-full lg:gap-3 ${
                active
                  ? 'bg-secondary text-primary font-semibold'
                  : 'text-foreground hover:bg-muted'
              }`;
              return href ? (
                <Link key={label} href={href} className={cls}>
                  <i className={`fa-solid ${icon} w-4 text-center text-xs`} />
                  <span className="lg:hidden">{shortLabel}</span>
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              ) : (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (id) setSection(id);
                    if (tab) setOverviewTab(tab);
                    else if (id === 'overview') setOverviewTab('about');
                  }}
                  className={cls}
                >
                  <i className={`fa-solid ${icon} w-4 text-center text-xs`} />
                  <span className="lg:hidden">{shortLabel}</span>
                  <span className="hidden lg:inline">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Invite friends card */}
          <div className="rounded-3xl bg-secondary p-5 text-center max-lg:hidden">
            <p className="text-2xl mb-2"><i className="fa-solid fa-mug-hot text-primary" /></p>
            <p className="font-heading font-bold text-secondary-foreground text-sm">Invite friends</p>
            <p className="text-secondary-foreground/80 text-xs mt-1">
              Grow your coffee circle.
            </p>
            <Link
              href="/invite"
              className="mt-3 block rounded-full bg-primary text-primary-foreground py-2 text-xs font-semibold hover:brightness-110 transition-[filter]"
            >
              Invite now
            </Link>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════
            MAIN — section-dependent content
        ══════════════════════════════════════════════════════════ */}
        <div className="order-2 min-w-0 space-y-6">

          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {section === 'overview' && (
            <>
              {/* Cover banner */}
              <div className="bg-ink relative overflow-hidden rounded-3xl p-6 shadow-glow">
                <div
                  className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full opacity-30 blur-3xl bg-gradient-hero"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                  {/* Large avatar with camera badge */}
                  <div className="relative shrink-0">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <Avatar name={displayName} src={user.photoUrl} size={96} />
                    <button
                      type="button"
                      aria-label="Change photo"
                      disabled={photoBusy}
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card text-xs transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {photoBusy ? (
                        <i className="fa-solid fa-spinner fa-spin text-[10px]" />
                      ) : (
                        <i className="fa-solid fa-camera" />
                      )}
                    </button>
                    {photoError && (
                      <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-destructive">
                        {photoError}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1
                        className="font-heading text-2xl font-extrabold leading-tight"
                        style={{ color: 'var(--ink-foreground)' }}
                      >
                        {displayName}
                      </h1>
                      {user.verificationStatus === 'VERIFIED' && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: 'oklch(1 0 0 / 0.15)', color: 'white' }}
                        >
                          <i className="fa-solid fa-circle-check text-[10px]" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm" style={{ color: 'oklch(1 0 0 / 0.65)' }}>
                      {bioLine}
                    </p>
                    <p className="mt-1 text-xs flex gap-3 flex-wrap" style={{ color: 'oklch(1 0 0 / 0.5)' }}>
                      <span><i className="fa-solid fa-location-dot mr-1" />{user.city ?? '—'}</span>
                      <span><i className="fa-solid fa-calendar-day mr-1" />Joined {joinDate}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSection('settings')}
                    className="shrink-0 self-start rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Stat tiles */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { icon: 'fa-mug-hot', label: 'Meetups Hosted', value: hostedView.length, accent: 'text-purple-400' },
                    { icon: 'fa-users', label: 'Meetups Joined', value: activeJoinedCount, accent: 'text-teal-400' },
                    { icon: 'fa-star', label: 'Reliability Score', value: user.reliabilityScore, accent: 'text-amber-400' },
                    { icon: 'fa-heart', label: 'Connections', value: connectionsCount ?? '—', accent: 'text-pink-400' },
                    { icon: 'fa-medal', label: 'Average Rating', value: avgRating, accent: 'text-blue-400' },
                  ].map(({ icon, label, value, accent }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center rounded-2xl p-3 text-center"
                      style={{ background: 'oklch(1 0 0 / 0.08)' }}
                    >
                      <span className={`text-lg leading-none ${accent}`}><i className={`fa-solid ${icon}`} /></span>
                      <span
                        className={`mt-1.5 font-heading text-xl font-extrabold leading-none ${accent}`}
                      >
                        {value}
                      </span>
                      <span
                        className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: 'oklch(1 0 0 / 0.5)' }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs: About / Achievements / Reviews / Activity — swipe on mobile */}
              <div className="min-w-0">
                <div
                  className="flex touch-pan-x overflow-x-auto overscroll-x-contain border-b border-border/60 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                  aria-label="Profile overview"
                >
                  {(
                    [
                      { id: 'about', label: 'About', short: 'About' },
                      { id: 'achievements', label: 'Achievements', short: 'Badges' },
                      { id: 'reviews', label: 'Reviews', short: 'Reviews' },
                      { id: 'activity', label: 'Activity Feed', short: 'Activity' },
                    ] as { id: typeof overviewTab; label: string; short: string }[]
                  ).map(({ id, label, short }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={overviewTab === id}
                      onClick={() => setOverviewTab(id)}
                      className={`-mb-px shrink-0 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
                        overviewTab === id
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="sm:hidden">{short}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-5">
                  {/* About tab */}
                  {overviewTab === 'about' && (
                    <div className="space-y-5">
                      <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-4">
                        <div>
                          <p className="eyebrow text-primary mb-2">About me</p>
                          <p className="text-sm text-muted-foreground">{bioLine}</p>
                        </div>
                        {user.occupation && (
                          <div className="flex items-center gap-2 text-sm">
                            <i className="fa-solid fa-briefcase text-muted-foreground text-xs" />
                            <span>{user.occupation}</span>
                          </div>
                        )}
                        {user.city && (
                          <div className="flex items-center gap-2 text-sm">
                            <i className="fa-solid fa-location-dot text-muted-foreground text-xs" />
                            <span>{user.city}</span>
                          </div>
                        )}
                      </div>

                      {interestList.length > 0 && (
                        <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="eyebrow text-primary">Interests &amp; Vibes</p>
                            <button
                              type="button"
                              onClick={() => setSection('settings')}
                              className="text-primary text-xs font-semibold hover:underline"
                            >
                              Manage
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {interestList.map((interest) => (
                              <span
                                key={interest}
                                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                              >
                                <i className={`fa-solid ${INTEREST_ICON[interest] ?? 'fa-circle-dot'} text-[10px]`} />
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Achievements tab — earned from real stats */}
                  {overviewTab === 'achievements' && (() => {
                    const accountAgeDays = (NOW - new Date(user.createdAt).getTime()) / 86_400_000;
                    const earnedBadges = [
                      {
                        icon: 'fa-mug-hot',
                        label: 'Great Host',
                        color: 'text-primary',
                        earned: hostedView.length >= 10,
                        subtitle: hostedView.length >= 10 ? 'Hosted 10+ meetups' : `${hostedView.length}/10 meetups hosted`,
                      },
                      {
                        icon: 'fa-link',
                        label: 'Connector',
                        color: 'text-[oklch(0.62_0.21_259)]',
                        earned: (connectionsCount ?? 0) >= 20,
                        subtitle: (connectionsCount ?? 0) >= 20 ? 'Made 20+ connections' : `${connectionsCount ?? 0}/20 connections`,
                      },
                      {
                        icon: 'fa-seedling',
                        label: 'Early Member',
                        color: 'text-[oklch(0.72_0.15_163)]',
                        earned: accountAgeDays >= 30,
                        subtitle: accountAgeDays >= 30 ? 'Joined early' : 'Join date < 30 days ago',
                      },
                      {
                        icon: 'fa-medal',
                        label: 'Top Rated',
                        color: 'text-[oklch(0.8_0.14_75)]',
                        earned: user.reliabilityScore >= 95,
                        subtitle: user.reliabilityScore >= 95 ? 'High reliability' : `Score: ${user.reliabilityScore}/95`,
                      },
                    ];
                    return (
                      <div className="rounded-3xl border bg-card p-5 shadow-soft">
                        <p className="eyebrow text-primary mb-4">Achievements</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {earnedBadges.map(({ icon, label, color, earned, subtitle }) => (
                            <div
                              key={label}
                              className={`flex flex-col items-center gap-2 rounded-2xl bg-muted/50 p-4 text-center transition-opacity ${earned ? 'opacity-100' : 'opacity-40'}`}
                            >
                              <div className="relative">
                                <i className={`fa-solid ${icon} text-2xl ${color}`} />
                                {earned && (
                                  <i className="fa-solid fa-circle-check text-primary text-xs absolute -top-1 -right-2" />
                                )}
                              </div>
                              <span className="text-xs font-semibold">{label}</span>
                              <span className="text-muted-foreground text-[10px]">{subtitle}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reviews tab */}
                  {overviewTab === 'reviews' && <MyReviews />}

                  {/* Activity feed — real notifications */}
                  {overviewTab === 'activity' && (
                    <div className="rounded-3xl border bg-card shadow-soft overflow-hidden">
                      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                        <p className="eyebrow text-primary">Activity Feed</p>
                        {notifications.unread > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {notifications.unread} new
                          </span>
                        )}
                      </div>
                      {notifications.items.length === 0 ? (
                        <div className="py-16 text-center">
                          <p className="text-4xl"><i className="fa-solid fa-clipboard-list text-muted-foreground" /></p>
                          <p className="font-heading mt-3 font-bold">No activity yet</p>
                          <p className="text-muted-foreground mt-1 text-sm">Your recent actions will appear here.</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-border/60">
                          {notifications.items.slice(0, 10).map((n) => (
                            <li key={n.id} className={`flex items-start gap-3 px-5 py-3.5 ${!n.readAt ? 'bg-primary/5' : ''}`}>
                              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                                <i className="fa-solid fa-bell" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-snug">{n.title}</p>
                                {n.body && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{n.body}</p>}
                              </div>
                              <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap mt-1">{ago(n.createdAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* My Upcoming Meetups */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold tracking-tight">My Upcoming Meetups</h2>
                  <Link href="/meetups" className="text-primary text-sm font-semibold hover:underline">
                    View all →
                  </Link>
                </div>
                {upcomingJoined.length === 0 ? (
                  <div className="rounded-3xl border border-dashed py-10 text-center">
                    <p className="text-3xl"><i className="fa-solid fa-chair text-muted-foreground" /></p>
                    <p className="text-muted-foreground mt-2 text-sm">No upcoming meetups.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {upcomingJoined.map((t) => (
                      <MeetupCoverCard key={t.id} t={t} />
                    ))}
                  </div>
                )}
              </section>

              {/* My Hosted Meetups */}
              {hostedView.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-heading text-lg font-bold tracking-tight">My Hosted Meetups</h2>
                    <Link href="/meetups" className="text-primary text-sm font-semibold hover:underline">
                      View all →
                    </Link>
                  </div>
                  <div className="rounded-3xl border bg-card p-5 shadow-soft">
                    {hostedView.slice(0, 3).map((t) => (
                      <HostedMeetupRow key={t.id} t={t} />
                    ))}
                  </div>
                </section>
              )}

              <FutureProfilePanel user={user} onSaved={refresh} />
            </>
          )}

          {/* ── SETTINGS — entire edit form verbatim ─────────────── */}
          {section === 'settings' && (
            <>
              <div>
                <p className="eyebrow text-primary">Account</p>
                <h1 className="display mt-1 text-2xl sm:text-3xl">Account Settings</h1>
              </div>

              <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
                {/* Section: Basic info */}
                <section className="space-y-4">
                  <p className="eyebrow text-primary">Basic info</p>

                  <div className="space-y-1.5">
                    <Label htmlFor="username">Handle</Label>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                        @
                      </span>
                      <Input
                        id="username"
                        className="pl-7"
                        autoCapitalize="none"
                        placeholder="sarah_k"
                        {...field('username')}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Your public identity — the only name other members see. Name, phone &
                      email stay private.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" {...field('firstName')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" {...field('lastName')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Age band</Label>
                      <select className={selectClass} {...field('ageBand')}>
                        <option value="">—</option>
                        <option>18-24</option>
                        <option>25-34</option>
                        <option>35-44</option>
                        <option>45+</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gender</Label>
                      <select className={selectClass} {...field('gender')}>
                        <option value="">—</option>
                        <option value="WOMAN">Woman</option>
                        <option value="MAN">Man</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Section: Location */}
                <section className="space-y-4">
                  <p className="eyebrow text-primary">Location</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <select className={selectClass} {...field('city')}>
                        <option value="">—</option>
                        <option>Islamabad</option>
                        <option>Lahore</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Language</Label>
                      <select className={selectClass} {...field('language')}>
                        <option value="">—</option>
                        <option value="URDU">Urdu</option>
                        <option value="ENGLISH">English</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="areas">Areas you can reach</Label>
                    <Input id="areas" placeholder="F-6, F-7, Blue Area" {...field('areas')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>What days are you available?</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                      {DAYS.map((d) => (
                        <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedDays.has(d)}
                            onChange={() => toggleDay(d)}
                            className="accent-primary"
                          />
                          {d}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section: About you */}
                <section className="space-y-4">
                  <p className="eyebrow text-primary">About you</p>

                  <div className="space-y-1.5">
                    <Label htmlFor="interests">Interests</Label>
                    <Input id="interests" placeholder="Books, Startups, Film" {...field('interests')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="occupation">What do you do?</Label>
                    <Input
                      id="occupation"
                      placeholder="Software engineer, Teacher, Student…"
                      {...field('occupation')}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Life stage</Label>
                      <select className={selectClass} {...field('lifeStage')}>
                        <option value="">—</option>
                        <option value="STUDENT">Student</option>
                        <option value="EARLY_CAREER">Early-career</option>
                        <option value="PROFESSIONAL">Professional</option>
                        <option value="BUSINESS_OWNER">Business owner</option>
                        <option value="PARENT">Parent</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>In a new group you…</Label>
                      <select className={selectClass} {...field('socialEnergy')}>
                        <option value="">—</option>
                        <option value="LISTENER">Listen &amp; warm up slowly</option>
                        <option value="MIX">A mix</option>
                        <option value="INITIATOR">Get it going</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Section: What you're hoping for */}
                <section className="space-y-3">
                  <p className="eyebrow text-primary">What are you hoping for?</p>
                  <div className="rounded-3xl border bg-card/60 p-4 space-y-2.5">
                    {Object.values(Intent).map((it) => (
                      <label key={it} className="flex items-center gap-3 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={intents.includes(it)}
                          onChange={(e) =>
                            setIntents((prev) =>
                              e.target.checked ? [...prev, it] : prev.filter((x) => x !== it),
                            )
                          }
                          className="accent-primary"
                        />
                        {INTENT_LABELS[it] ?? it}
                      </label>
                    ))}
                  </div>
                </section>

                {/* Section: Preferences */}
                <section className="space-y-4">
                  <p className="eyebrow text-primary">Preferences</p>

                  <div className="space-y-1.5">
                    <Label>Coffee or chai?</Label>
                    <select className={selectClass} {...field('beveragePref')}>
                      <option value="">—</option>
                      <option value="COFFEE">Coffee</option>
                      <option value="CHAI">Chai</option>
                      <option value="EITHER">Either</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="accessibilityNeeds">Accessibility needs (optional)</Label>
                    <Textarea id="accessibilityNeeds" {...field('accessibilityNeeds')} />
                  </div>
                </section>

                {/* Section: Consent */}
                <section className="rounded-3xl border bg-card/60 p-4 space-y-3">
                  <p className="eyebrow text-primary">Consent</p>
                  <label className="flex min-w-0 items-start gap-3 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={photo}
                      onChange={(e) => setPhoto(e.target.checked)}
                      className="mt-0.5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 break-words">OK to appear in event group photos</span>
                  </label>
                  <label
                    id="code-of-conduct"
                    className="flex min-w-0 scroll-mt-24 items-start gap-3 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 break-words">I agree to the Community Code of Conduct</span>
                  </label>
                </section>

                {formStatus && <p className="text-sm text-green-600 font-medium lg:col-span-2">{formStatus}</p>}
                {formError && <p className="text-destructive text-sm lg:col-span-2">{formError}</p>}

                <Button type="submit" size="lg" className="w-full lg:col-span-2" disabled={busy}>
                  {busy ? 'Saving…' : 'Save profile'}
                </Button>
              </form>

              {/* CNIC upload */}
              <IdentityCard
                verificationStatus={user.verificationStatus}
                email={user.email ?? null}
                onCnicChange={(e) => void handleCnic(e)}
                cnicMsg={cnicMsg}
              />

              {/* Reviews at the bottom of settings */}
              <MyReviews />
            </>
          )}

          {/* ── REVIEWS section ──────────────────────────────────── */}
          {section === 'reviews' && (
            <>
              <div>
                <p className="eyebrow text-primary">Profile</p>
                <h1 className="display mt-1 text-2xl sm:text-3xl">Reviews &amp; Ratings</h1>
              </div>
              <MyReviews />
            </>
          )}

          {/* ── IDENTITY section ─────────────────────────────────── */}
          {section === 'identity' && (
            <>
              <div>
                <p className="eyebrow text-primary">Profile</p>
                <h1 className="display mt-1 text-2xl sm:text-3xl">Identity Verification</h1>
              </div>
              <IdentityCard
                verificationStatus={user.verificationStatus}
                email={user.email ?? null}
                onCnicChange={(e) => void handleCnic(e)}
                cnicMsg={cnicMsg}
              />
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            RIGHT RAIL — desktop only
        ══════════════════════════════════════════════════════════ */}
        <aside className="order-3 max-lg:hidden min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">

          {/* Reliability Score card */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-4">
            <p className="eyebrow text-primary">Reliability Score</p>
            <div className="flex items-center gap-4">
              <ReliabilityGauge score={user.reliabilityScore} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading text-2xl font-extrabold">{user.reliabilityScore}</p>
                  {user.reliabilityScore >= 95 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Top Rated
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">/ 100 points</p>
                <p className="text-primary text-xs font-semibold mt-1">
                  {user.reliabilityScore >= 95
                    ? "You're one of our most reliable community members."
                    : "You're a reliable member — keep it up!"}
                </p>
              </div>
            </div>

            {/* Breakdown — derived, sum = reliability score */}
            <div className="space-y-2">
              {[
                { label: 'Great communication', value: s1 },
                { label: 'Shows up on time', value: s2 },
                { label: 'Respectful & friendly', value: s3 },
                { label: 'Organized meetups', value: s4 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-primary">{value}/25</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-[10px]">
              * Breakdown is derived from your total score.
            </p>
          </div>

          {/* Identity Verification card */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-3">
            <p className="eyebrow text-primary">Identity Verification</p>
            {[
              { icon: 'fa-phone', label: 'Phone Number', status: 'Verified', verified: true },
              {
                icon: 'fa-envelope',
                label: 'Email Address',
                status: user.email ? 'Verified' : 'Not added',
                verified: !!user.email,
              },
              {
                icon: 'fa-id-card',
                label: 'Government ID',
                status:
                  user.verificationStatus === 'VERIFIED'
                    ? 'Verified'
                    : user.verificationStatus === 'PENDING'
                      ? 'Pending'
                      : 'Not submitted',
                verified: user.verificationStatus === 'VERIFIED',
              },
            ].map(({ icon, label, status, verified }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className={`fa-solid ${icon} text-muted-foreground text-xs w-4 text-center`} />
                  <span className="text-sm">{label}</span>
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold ${verified ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {verified && (
                    <span className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">✓</span>
                  )}
                  {status}
                </span>
              </div>
            ))}
          </div>

          {/* Achievements card — earned from real stats */}
          {(() => {
            const accountAgeDays = (NOW - new Date(user.createdAt).getTime()) / 86_400_000;
            const railBadges = [
              { icon: 'fa-mug-hot', label: 'Great Host', color: 'text-primary', earned: hostedView.length >= 10 },
              { icon: 'fa-link', label: 'Connector', color: 'text-[oklch(0.62_0.21_259)]', earned: (connectionsCount ?? 0) >= 20 },
              { icon: 'fa-seedling', label: 'Early Member', color: 'text-[oklch(0.72_0.15_163)]', earned: accountAgeDays >= 30 },
              { icon: 'fa-medal', label: 'Top Rated', color: 'text-[oklch(0.8_0.14_75)]', earned: user.reliabilityScore >= 95 },
            ];
            return (
              <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-primary">Achievements</p>
                  <button
                    type="button"
                    className="text-primary text-xs font-semibold hover:underline"
                    onClick={() => { setSection('overview'); setOverviewTab('achievements'); }}
                  >
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {railBadges.map(({ icon, label, color, earned }) => (
                    <div
                      key={label}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl bg-muted/50 p-3 text-center transition-opacity ${earned ? 'opacity-100' : 'opacity-40'}`}
                    >
                      <div className="relative">
                        <i className={`fa-solid ${icon} text-xl ${color}`} />
                        {earned && (
                          <i className="fa-solid fa-circle-check text-primary text-[8px] absolute -top-1 -right-2" />
                        )}
                      </div>
                      <span className="text-[10px] font-semibold leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Connect your socials — stub */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft space-y-3">
            <div>
              <p className="eyebrow text-primary">Connect your socials</p>
              <p className="text-muted-foreground text-xs mt-1">Grow your network and never miss an update.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: 'fa-brands fa-linkedin', label: 'LinkedIn' },
                { icon: 'fa-brands fa-instagram', label: 'Instagram' },
                { icon: 'fa-brands fa-x-twitter', label: 'X' },
                { icon: 'fa-brands fa-spotify', label: 'Spotify' },
                { icon: 'fa-solid fa-link', label: 'Website' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={label}
                  title={label}
                  className="flex size-9 items-center justify-center rounded-full border bg-muted text-muted-foreground text-sm opacity-50 cursor-not-allowed"
                >
                  <i className={icon} />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
