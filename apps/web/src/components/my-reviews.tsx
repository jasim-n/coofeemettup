'use client';

import { useEffect, useState } from 'react';
import { type UserReputation } from '@jrst/api-client';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stars } from '@/components/stars';

/** Score-only reputation for the signed-in user (no individual review text). */
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
  const overall = rep.overallRating ?? {
    avg: 0,
    count: (rep.hostRating.count || 0) + (rep.guestRating.count || 0),
  };
  const none = overall.count === 0;

  return (
    <Card className="rounded-3xl shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Your rating</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {none ? (
          <p className="text-muted-foreground text-sm">
            No ratings yet — host or join a table to build your score.
          </p>
        ) : (
          <>
            <RatingPill label="Overall" avg={overall.avg} count={overall.count} />
            <div className="grid grid-cols-2 gap-3">
              <RatingPill label="As host" avg={rep.hostRating.avg} count={rep.hostRating.count} />
              <RatingPill label="As guest" avg={rep.guestRating.avg} count={rep.guestRating.count} />
            </div>
            <p className="text-muted-foreground text-xs">
              Individual reviews stay private. Only your calculated score is shown.
            </p>
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
