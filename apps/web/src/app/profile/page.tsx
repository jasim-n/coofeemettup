'use client';
/* eslint-disable react-hooks/set-state-in-effect -- hydrating the form once from the async-loaded profile */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, Intent, type UpdateProfileInput } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { parseList } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const selectClass =
  'h-10 rounded-full border border-input bg-card/60 px-4 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

const INTENT_LABELS: Record<string, string> = {
  MAKE_FRIENDS: 'Make new friends',
  MEET_OUTSIDE_BUBBLE: 'Meet people outside my bubble',
  NETWORKING: 'Networking',
  NEW_TO_CITY: "I'm new to the city",
  PRACTICE_ENGLISH: 'Practice English',
};

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
      newcomerStatus: user.newcomerStatus ?? '',
      beveragePref: user.beveragePref ?? '',
      accessibilityNeeds: user.accessibilityNeeds ?? '',
    });
    setIntents(user.intents);
    setPhoto(user.photoConsent);
    setConsent(Boolean(user.codeOfConductAt));
  }, [user]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
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

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Account</p>
          <h1 className="display mt-1 text-3xl">Your profile</h1>
        </div>
        <Link href="/events" className="text-muted-foreground font-semibold text-sm hover:underline">
          Meetups
        </Link>
      </div>

      {/* Identity verification */}
      <div className="mb-8 rounded-3xl border bg-card p-5 shadow-soft space-y-3">
        <p className="eyebrow text-primary">Identity verification</p>
        <p className="text-sm text-muted-foreground">
          Status:{' '}
          <span className="font-heading font-bold text-foreground">{user.verificationStatus}</span>
        </p>
        {user.verificationStatus !== 'VERIFIED' && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              Upload a photo of your CNIC for review.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleCnic(e)}
              className="text-xs"
            />
          </div>
        )}
        {cnicMsg && <p className="text-xs text-green-600">{cnicMsg}</p>}
      </div>

      <form onSubmit={submit} className="space-y-8">
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
                <option value="UNDISCLOSED">Prefer not to say</option>
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
            <Label htmlFor="availability">When are you free?</Label>
            <Input id="availability" placeholder="Sat afternoon, Sun afternoon" {...field('availability')} />
          </div>
        </section>

        {/* Section: About you */}
        <section className="space-y-4">
          <p className="eyebrow text-primary">About you</p>

          <div className="space-y-1.5">
            <Label htmlFor="interests">Interests</Label>
            <Input id="interests" placeholder="Books, Startups, Film" {...field('interests')} />
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
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="accent-primary"
            />
            I agree to the Community Code of Conduct
          </label>
        </section>

        {status && <p className="text-sm text-green-600 font-medium">{status}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </Button>
      </form>
    </main>
  );
}
