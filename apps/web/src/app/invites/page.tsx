'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type InviteDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { categoryIcon } from '@/lib/category-icon';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { UserLink } from '@/components/user-link';
import { PageLoader } from '@/components/spinner';
import { Button } from '@/components/ui/button';
const personName = (u: { firstName?: string | null; lastInitial?: string | null }) =>
  `${u.firstName ?? 'Member'} ${u.lastInitial ?? ''}`.trim();

function Toast({ msg }: { msg: string }) {
  return (
    <div className="bg-primary text-primary-foreground shadow-glow fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-2.5 text-sm font-semibold">
      {msg}
    </div>
  );
}

function InviteCard({
  invite,
  onRemove,
}: {
  invite: InviteDto;
  onRemove: (id: string, toast: string) => void;
}) {
  const [busy, setBusy] = useState<'accept' | 'maybe' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'accept' | 'maybe' | 'decline') {
    setBusy(action);
    setError(null);
    try {
      if (action === 'accept') await api.acceptInvite(invite.id);
      else if (action === 'maybe') await api.maybeInvite(invite.id);
      else await api.declineInvite(invite.id);
      const toastMsg =
        action === 'accept' ? 'Joined ✓' : action === 'maybe' ? 'Marked maybe' : 'Declined';
      onRemove(invite.id, toastMsg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setBusy(null);
    }
  }

  const { table, inviter } = invite;
  const isBusy = busy !== null;

  return (
    <div className="bg-card shadow-soft ring-border/60 overflow-hidden rounded-3xl ring-1">
      {/* Cover thumb */}
      <div className="relative h-40">
        <Cover
          category={table.category}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="glass absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20">
          <i className={`fa-solid ${categoryIcon(table.category)} mr-1`} />{table.category}
        </span>
      </div>

      <div className="p-5 space-y-3">
        {/* Title */}
        <Link
          href={`/tables/${table.id}`}
          className="font-heading block truncate text-base font-bold tracking-tight hover:underline"
        >
          <i className={`fa-solid ${categoryIcon(table.category)} mr-1`} />{table.title ?? table.category}
        </Link>

        {/* Meta */}
        <div className="text-muted-foreground space-y-1 text-sm">
          <p><i className="fa-solid fa-location-dot mr-1" />{table.venueName ?? 'See map'}</p>
          <p><i className="fa-solid fa-calendar-day mr-1" />{formatDateTime(table.startAt)}</p>
        </div>

        {/* Inviter */}
        <div className="flex items-center gap-2">
          <UserLink userId={inviter.id} className="flex items-center gap-2">
            <Avatar name={personName(inviter)} size={24} />
            <span className="text-muted-foreground text-xs">
              Invited by{' '}
              <span className="text-foreground font-semibold">{personName(inviter)}</span>
            </span>
          </UserLink>
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            disabled={isBusy}
            onClick={() => void act('accept')}
            className="flex-1"
          >
            {busy === 'accept' ? '…' : 'Accept'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => void act('maybe')}
          >
            {busy === 'maybe' ? '…' : 'Maybe'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => void act('decline')}
          >
            {busy === 'decline' ? '…' : 'Decline'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InvitesPage() {
  const { user, loading } = useAuth();
  const [invites, setInvites] = useState<InviteDto[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const data = await api.myInvites();
        if (active) {
          setInvites(data);
          setFetched(true);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load invitations');
          setFetched(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function handleRemove(id: string, msg: string) {
    setInvites((prev) => prev.filter((inv) => inv.id !== id));
    setToast(msg);
  }

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please{' '}
        <Link href="/login" className="underline">
          sign in
        </Link>{' '}
        first.
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      {toast && <Toast msg={toast} />}

      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow text-primary">Invitations</p>
        <h1 className="display text-3xl">Your invitations</h1>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {/* Empty state */}
      {fetched && invites.length === 0 && !error && (
        <div className="rounded-3xl border border-dashed py-20 text-center">
          <i className="fa-regular fa-envelope-open text-muted-foreground mb-3 text-4xl" />
          <p className="font-heading mt-2 font-bold">No invitations right now.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            When someone invites you to their table, it&apos;ll appear here.
          </p>
        </div>
      )}

      {/* Invite cards grid */}
      {invites.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {invites.map((inv) => (
            <InviteCard key={inv.id} invite={inv} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </main>
  );
}
