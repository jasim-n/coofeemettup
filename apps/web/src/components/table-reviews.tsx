'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, type ReviewTargetsResponse } from '@jrst/api-client';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Stars } from '@/components/stars';

/** Post-event review section for a table (host reviews guests, guests review the host). */
export default function TableReviews({ tableId }: { tableId: string }) {
  const [data, setData] = useState<ReviewTargetsResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.tableReviewTargets(tableId));
    } catch {
      setData({ eligible: false, happened: false, targets: [] });
    }
  }, [tableId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load, state set after await
    void load();
  }, [load]);

  if (!data) return null;
  if (!data.happened) {
    return (
      <div className="border-t pt-4">
        <p className="eyebrow text-primary mb-1">Reviews</p>
        <p className="text-muted-foreground text-sm">
          You’ll be able to leave a review once the table has happened.
        </p>
      </div>
    );
  }
  if (!data.eligible || data.targets.length === 0) return null;

  const pending = data.targets.filter((t) => !t.alreadyReviewed);

  async function submit(subjectId: string) {
    const d = drafts[subjectId];
    if (!d || d.rating < 1) {
      setError('Pick a star rating first.');
      return;
    }
    setBusy(subjectId);
    setError(null);
    try {
      await api.createReview(tableId, {
        subjectId,
        rating: d.rating,
        comment: d.comment.trim() || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit review');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="eyebrow text-primary">Leave a review</p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {pending.length === 0 && (
        <p className="text-muted-foreground text-sm">Thanks for your reviews ✓</p>
      )}
      {pending.map((t) => {
        const d = drafts[t.subjectId] ?? { rating: 0, comment: '' };
        return (
          <div key={t.subjectId} className="space-y-2 rounded-2xl border p-3">
            <p className="text-sm font-medium">
              {t.name}{' '}
              <span className="text-muted-foreground text-xs font-normal">
                · as {t.role.toLowerCase()}
              </span>
            </p>
            <Stars
              value={d.rating}
              onChange={(rating) =>
                setDrafts((prev) => ({ ...prev, [t.subjectId]: { ...d, rating } }))
              }
            />
            <Textarea
              rows={2}
              placeholder="Add a comment (optional)"
              value={d.comment}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [t.subjectId]: { ...d, comment: e.target.value },
                }))
              }
            />
            <Button
              size="sm"
              disabled={busy === t.subjectId}
              onClick={() => void submit(t.subjectId)}
            >
              {busy === t.subjectId ? 'Submitting…' : 'Submit review'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
