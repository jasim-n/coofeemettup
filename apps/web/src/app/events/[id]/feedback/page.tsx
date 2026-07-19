'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError, type SubmitFeedbackInput } from '@jrst/api-client';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const selectClass =
  'h-10 rounded-full border border-input bg-card/60 px-4 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25';

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<SubmitFeedbackInput>({
    enjoyment: 5,
    meetAgain: 'ALL',
    mixFelt: 'JUST_RIGHT',
    sizeFelt: 'JUST_RIGHT',
    cafeRating: 5,
    comeAgain: 'YES',
    inviteFriend: true,
    nps: 9,
    feltUnsafe: false,
    improve: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof SubmitFeedbackInput>(key: K, value: SubmitFeedbackInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.submitFeedback(id, form);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-20 text-center">
        <div className="rounded-3xl border border-dashed py-14">
          <p className="text-5xl">🙏</p>
          <h1 className="display mt-4 text-2xl uppercase">Thanks!</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Your feedback helps us make better matches.
          </p>
          <Link
            href="/events"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
          >
            ← Back to meetups
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      {/* header */}
      <div className="mb-8">
        <p className="eyebrow text-primary">Post-meetup</p>
        <h1 className="display mt-2 text-3xl uppercase">How was it? ☕</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Takes 60 seconds. Shapes every meetup after this.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* enjoyment */}
        <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3">
          <p className="eyebrow text-primary">Your vibe</p>
          <div className="space-y-1.5">
            <Label htmlFor="enjoyment" className="font-semibold">Enjoyment (1–5)</Label>
            <Input
              id="enjoyment"
              type="number"
              min={1}
              max={5}
              value={form.enjoyment}
              onChange={(e) => set('enjoyment', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">Would you meet this group again?</Label>
            <select
              className={selectClass}
              value={form.meetAgain}
              onChange={(e) => set('meetAgain', e.target.value as SubmitFeedbackInput['meetAgain'])}
            >
              <option value="ALL">Yes, all of them</option>
              <option value="SOME">Some of them</option>
              <option value="NO">No</option>
            </select>
          </div>
        </div>

        {/* group feel */}
        <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3">
          <p className="eyebrow text-primary">The group</p>
          <div className="space-y-1.5">
            <Label className="font-semibold">The group mix felt…</Label>
            <select
              className={selectClass}
              value={form.mixFelt}
              onChange={(e) => set('mixFelt', e.target.value as SubmitFeedbackInput['mixFelt'])}
            >
              <option value="TOO_SIMILAR">Too similar</option>
              <option value="JUST_RIGHT">Just right</option>
              <option value="TOO_DIFFERENT">Too different</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">The group size felt…</Label>
            <select
              className={selectClass}
              value={form.sizeFelt}
              onChange={(e) => set('sizeFelt', e.target.value as SubmitFeedbackInput['sizeFelt'])}
            >
              <option value="TOO_SMALL">Too small</option>
              <option value="JUST_RIGHT">Just right</option>
              <option value="TOO_BIG">Too big</option>
            </select>
          </div>
        </div>

        {/* venue + would-you-return */}
        <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3">
          <p className="eyebrow text-primary">The venue</p>
          <div className="space-y-1.5">
            <Label htmlFor="cafeRating" className="font-semibold">Cafe rating (1–5)</Label>
            <Input
              id="cafeRating"
              type="number"
              min={1}
              max={5}
              value={form.cafeRating}
              onChange={(e) => set('cafeRating', Number(e.target.value))}
            />
          </div>
        </div>

        {/* come back */}
        <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3">
          <p className="eyebrow text-primary">Next time</p>
          <div className="space-y-1.5">
            <Label className="font-semibold">Would you come to another meetup?</Label>
            <select
              className={selectClass}
              value={form.comeAgain}
              onChange={(e) => set('comeAgain', e.target.value as SubmitFeedbackInput['comeAgain'])}
            >
              <option value="YES">Yes</option>
              <option value="MAYBE">Maybe</option>
              <option value="NO">No</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={form.inviteFriend}
              onChange={(e) => set('inviteFriend', e.target.checked)}
            />
            I&apos;d invite a friend to the next one
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="nps" className="font-semibold">Recommend to a friend? (0–10)</Label>
            <Input
              id="nps"
              type="number"
              min={0}
              max={10}
              value={form.nps}
              onChange={(e) => set('nps', Number(e.target.value))}
            />
          </div>
        </div>

        {/* safety */}
        <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3">
          <p className="eyebrow text-primary">Safety</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-destructive size-4"
              checked={form.feltUnsafe ?? false}
              onChange={(e) => set('feltUnsafe', e.target.checked)}
            />
            Something made me feel uncomfortable or unsafe
          </label>
          {form.feltUnsafe && (
            <Textarea
              placeholder="Tell us privately what happened"
              value={form.unsafeDetails ?? ''}
              onChange={(e) => set('unsafeDetails', e.target.value)}
            />
          )}
        </div>

        {/* optional improvement */}
        <div className="space-y-1.5">
          <Label htmlFor="improve" className="font-semibold">Anything we could do better? (optional)</Label>
          <Textarea
            id="improve"
            value={form.improve ?? ''}
            onChange={(e) => set('improve', e.target.value)}
          />
        </div>

        {error && <p className="text-destructive text-sm font-medium">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit feedback →'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push('/events')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
