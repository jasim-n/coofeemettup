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
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring';

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
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Thank you! 🙏</h1>
        <p className="text-muted-foreground mt-2 text-sm">Your feedback helps us make better matches.</p>
        <Link href="/events" className="mt-4 inline-block text-sm hover:underline">
          ← Back to meetups
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">How was it?</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="enjoyment">Enjoyment (1–5)</Label>
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
          <Label>Would you meet this group again?</Label>
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

        <div className="space-y-1.5">
          <Label>The group mix felt…</Label>
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
          <Label>The group size felt…</Label>
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

        <div className="space-y-1.5">
          <Label htmlFor="cafeRating">Cafe rating (1–5)</Label>
          <Input
            id="cafeRating"
            type="number"
            min={1}
            max={5}
            value={form.cafeRating}
            onChange={(e) => set('cafeRating', Number(e.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Would you come to another meetup?</Label>
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.inviteFriend}
            onChange={(e) => set('inviteFriend', e.target.checked)}
          />
          I&apos;d invite a friend to the next one
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="nps">Recommend to a friend? (0–10)</Label>
          <Input
            id="nps"
            type="number"
            min={0}
            max={10}
            value={form.nps}
            onChange={(e) => set('nps', Number(e.target.value))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
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

        <div className="space-y-1.5">
          <Label htmlFor="improve">Anything we could do better? (optional)</Label>
          <Textarea
            id="improve"
            value={form.improve ?? ''}
            onChange={(e) => set('improve', e.target.value)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit feedback'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/events')}>
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
