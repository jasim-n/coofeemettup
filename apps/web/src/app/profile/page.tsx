'use client';
/* eslint-disable react-hooks/set-state-in-effect -- hydrating the form once from the async-loaded profile */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, Intent, type TableDto, type UserReputation, type UpdateProfileInput } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { parseList } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MyReviews from '@/components/my-reviews';
import { PageLoader } from '@/components/spinner';

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

interface ProfileStats {
  hosted: number;
  joined: number;
  avgRating: number;
}

function formatJoinDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function ReliabilityGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const deg = clampedScore * 3.6;
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft flex flex-col items-center gap-3">
      <p className="eyebrow text-primary">Reliability</p>
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 112,
          height: 112,
          background: `conic-gradient(var(--primary) ${deg}deg, var(--muted) 0deg)`,
        }}
      >
        <div className="absolute flex flex-col items-center justify-center rounded-full bg-card"
          style={{ width: 80, height: 80 }}>
          <span className="font-heading text-2xl font-extrabold leading-none">{clampedScore}</span>
          <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide mt-0.5">/ 100</span>
        </div>
      </div>
      <p className="text-muted-foreground text-xs text-center">
        Based on attendance &amp; punctuality
      </p>
    </div>
  );
}

function IdentityCard({
  verificationStatus,
  onCnicChange,
  cnicMsg,
}: {
  verificationStatus: string;
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
          <span className="text-sm font-medium">Phone number</span>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          <span className="size-4 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">✓</span>
          Verified
        </span>
      </div>

      <div className="h-px bg-border" />

      {/* Government ID */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Government ID</span>
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

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [intents, setIntents] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cnicMsg, setCnicMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ hosted: 0, joined: 0, avgRating: 0 });

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName ?? '',
      lastInitial: user.lastInitial ?? '',
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

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [hosted, joined, reviews] = await Promise.all([
          user.canHost ? api.myHostedTables() : Promise.resolve([] as TableDto[]),
          api.myJoinedTables(),
          api.myReviews() as Promise<UserReputation>,
        ]);
        if (!active) return;
        const joinedCount = joined.filter(
          (t) => t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING',
        ).length;
        setStats({
          hosted: hosted.length,
          joined: joinedCount,
          avgRating: reviews.hostRating.count > 0 ? reviews.hostRating.avg : 0,
        });
      } catch {
        // best-effort, defaults remain 0
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

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
    setError(null);
    setStatus(null);
    setBusy(true);
    const payload: UpdateProfileInput = {
      firstName: form.firstName || undefined,
      lastInitial: form.lastInitial || undefined,
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
      setStatus('Saved!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
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

  const displayName = user.firstName ?? user.phone;
  const initial = (user.firstName?.[0] ?? user.phone?.[0] ?? '?').toUpperCase();
  const joinDate = formatJoinDate(user.createdAt);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      {/* ── Page header (eyebrow + nav) ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Account</p>
          <h1 className="display mt-1 text-3xl">Your profile</h1>
        </div>
        <Link href="/meetups" className="text-muted-foreground font-semibold text-sm hover:underline">
          My meetups
        </Link>
      </div>

      {/* ── Main grid: left (2/3) + right rail (1/3) ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* ── Profile hero banner ── */}
          <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-8 shadow-glow">
            {/* decorative gradient blob */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full opacity-30 blur-3xl bg-gradient-hero"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              {/* Avatar */}
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-full text-3xl font-extrabold font-heading"
                style={{ background: 'oklch(1 0 0 / 0.15)', color: 'white' }}
              >
                {initial}
              </div>

              {/* Name / meta */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="font-heading text-2xl font-extrabold leading-tight"
                    style={{ color: 'var(--ink-foreground)' }}
                  >
                    {displayName}
                  </h2>
                  {user.verificationStatus === 'VERIFIED' && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: 'oklch(1 0 0 / 0.15)', color: 'white' }}
                    >
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p
                  className="mt-0.5 text-sm font-medium"
                  style={{ color: 'oklch(1 0 0 / 0.65)' }}
                >
                  @{user.phone}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'oklch(1 0 0 / 0.5)' }}
                >
                  📍 {user.city ?? '—'} · Joined {joinDate}
                </p>
              </div>

              {/* Edit CTA */}
              <a
                href="#firstName"
                className="shrink-0 self-start rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 sm:self-center"
              >
                Edit profile ↓
              </a>
            </div>

            {/* ── Stat tiles ── */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: '🫖', label: 'Hosted', value: stats.hosted },
                { icon: '🎟️', label: 'Joined', value: stats.joined },
                { icon: '⭐', label: 'Reliability', value: user.reliabilityScore },
                {
                  icon: '🌟',
                  label: 'Avg rating',
                  value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—',
                },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-2xl p-3 text-center"
                  style={{ background: 'oklch(1 0 0 / 0.08)' }}
                >
                  <span className="text-lg leading-none">{icon}</span>
                  <span
                    className="mt-1.5 font-heading text-xl font-extrabold leading-none"
                    style={{ color: 'var(--ink-foreground)' }}
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

          {/* ── Edit form ── */}
          <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
            {/* Section: Basic info */}
            <section className="space-y-4">
              <p className="eyebrow text-primary">Basic info</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" {...field('firstName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastInitial">Last initial</Label>
                  <Input id="lastInitial" maxLength={2} {...field('lastInitial')} />
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

              <div className="grid grid-cols-2 gap-3">
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
                  <option value="COFFEE">Coffee ☕</option>
                  <option value="CHAI">Chai 🍵</option>
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
              <label className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={photo}
                  onChange={(e) => setPhoto(e.target.checked)}
                  className="accent-primary"
                />
                OK to appear in event group photos
              </label>
              <label
                id="code-of-conduct"
                className="flex scroll-mt-24 items-center gap-3 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="accent-primary"
                />
                I agree to the Community Code of Conduct
              </label>
            </section>

            {status && <p className="text-sm text-green-600 font-medium lg:col-span-2">{status}</p>}
            {error && <p className="text-destructive text-sm lg:col-span-2">{error}</p>}

            <Button type="submit" size="lg" className="w-full lg:col-span-2" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </Button>
          </form>

          {/* Reviews / reputation */}
          <div>
            <MyReviews />
          </div>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div className="space-y-4">
          <ReliabilityGauge score={user.reliabilityScore} />
          <IdentityCard
            verificationStatus={user.verificationStatus}
            onCnicChange={(e) => void handleCnic(e)}
            cnicMsg={cnicMsg}
          />
        </div>
      </div>
    </main>
  );
}
