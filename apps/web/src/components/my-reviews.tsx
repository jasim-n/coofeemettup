'use client';

import { useEffect, useState } from 'react';
import { type UserReputation } from '@jrst/api-client';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stars } from '@/components/stars';

export default function MyReviews() {
  const [rep, setRep] = useState<UserReputation | null>(null);

  useEffect(() => {
    let active = true;
    api
      .myReviews()
      .then((r) => active && setRep(r))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!rep) return null;
  const none = rep.hostRating.count === 0 && rep.guestRating.count === 0;

  return (
    <Card className="rounded-3xl shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {none ? (
          <p className="text-muted-foreground text-sm">
            No reviews yet — host or join a table to build your reputation.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <RatingPill label="As host" avg={rep.hostRating.avg} count={rep.hostRating.count} />
              <RatingPill label="As guest" avg={rep.guestRating.avg} count={rep.guestRating.count} />
            </div>
            {rep.recent.length > 0 && (
              <div className="space-y-2">
                {rep.recent.slice(0, 5).map((r) => (
                  <div key={r.id} className="rounded-2xl border p-3">
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} size="text-sm" />
                      <span className="text-muted-foreground text-xs">
                        @{r.reviewer.username ?? 'member'} · as{' '}
                        {r.role.toLowerCase()}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RatingPill({ label, avg, count }: { label: string; avg: number; count: number }) {
  return (
    <div className="bg-muted/50 rounded-2xl p-3 text-center">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      {count > 0 ? (
        <>
          <p className="font-heading text-2xl font-extrabold">{avg}</p>
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
