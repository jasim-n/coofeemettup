'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, type ConnectionRequestDto, type PublicUser, type SuggestedPerson } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { ConnectButton } from '@/components/connect-button';
import { UserLink } from '@/components/user-link';
import { PageLoader } from '@/components/spinner';

/* ─── helpers ────────────────────────────────────────────────── */

function displayName(u: PublicUser): string {
  return `${u.firstName ?? 'Member'} ${u.lastInitial ?? ''}`.trim();
}

/* ─── sub-components ─────────────────────────────────────────── */

function PersonCard({
  user,
  sub,
  connectSlot,
}: {
  user: PublicUser;
  sub: React.ReactNode;
  connectSlot: React.ReactNode;
}) {
  const name = displayName(user);
  return (
    <div className="bg-card shadow-soft ring-border/60 flex flex-col items-center gap-3 rounded-3xl p-5 ring-1 text-center">
      <UserLink userId={user.id} className="flex flex-col items-center gap-3">
        <Avatar name={name} size={56} />
        <div className="min-w-0 w-full">
          <p className="font-heading text-sm font-bold truncate">{name}</p>
          {sub}
        </div>
      </UserLink>
      {connectSlot}
    </div>
  );
}

function RequestRow({ req }: { req: ConnectionRequestDto }) {
  const name = displayName(req.user);
  return (
    <div className="bg-card shadow-soft ring-border/60 flex items-center gap-4 rounded-2xl p-4 ring-1">
      <UserLink userId={req.user.id} className="flex items-center gap-4 min-w-0 flex-1">
        <Avatar name={name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold">{name}</p>
          <p className="text-muted-foreground text-xs">wants to connect</p>
        </div>
      </UserLink>
      <ConnectButton userId={req.user.id} initial="pending_received" />
    </div>
  );
}

/* ─── tab badge ──────────────────────────────────────────────── */

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-primary text-primary-foreground ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
      {count}
    </span>
  );
}

/* ─── empty state ─────────────────────────────────────────────── */

function Empty({ icon, message, cta }: { icon: string; message: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed py-16 text-center">
      <p className="text-4xl">{icon}</p>
      <p className="text-muted-foreground mt-3 text-sm">{message}</p>
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────── */

type Tab = 'connections' | 'requests' | 'suggestions';

export default function ConnectionsPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('connections');

  const [connections, setConnections] = useState<PublicUser[] | null>(null);
  const [requests, setRequests] = useState<ConnectionRequestDto[] | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [conns, reqs, suggs] = await Promise.all([
          api.myConnections(),
          api.connectionRequests(),
          api.connectionSuggestions(),
        ]);
        if (!active) return;
        setConnections(conns);
        setRequests(reqs);
        setSuggestions(suggs);
      } catch (err) {
        if (active)
          setError(err instanceof ApiError ? err.message : 'Failed to load connections');
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

  const requestCount = requests?.length ?? 0;

  const TAB_LIST: { id: Tab; label: string }[] = [
    { id: 'connections', label: 'Connections' },
    { id: 'requests', label: 'Requests' },
    { id: 'suggestions', label: 'Suggestions' },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
      {/* ── header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="eyebrow text-primary">Your network</p>
        <h1 className="display font-heading mt-1 text-3xl font-extrabold tracking-tight">
          Connections
        </h1>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {/* ── tabs ───────────────────────────────────────────────── */}
      <div className="mb-6 flex border-b border-border/60">
        {TAB_LIST.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px flex items-center px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {id === 'requests' && <TabBadge count={requestCount} />}
          </button>
        ))}
      </div>

      {/* ── connections tab ────────────────────────────────────── */}
      {tab === 'connections' && (
        <>
          {connections === null ? (
            <PageLoader label="Loading connections…" />
          ) : connections.length === 0 ? (
            <Empty
              icon="🤝"
              message="You don't have any connections yet."
              cta={
                <button
                  type="button"
                  onClick={() => setTab('suggestions')}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Browse suggestions →
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {connections.map((u) => (
                <PersonCard
                  key={u.id}
                  user={u}
                  sub={
                    <>
                      {u.city && (
                        <p className="text-muted-foreground mt-0.5 text-xs">📍 {u.city}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        ⭐ {u.reliabilityScore} reliability
                      </p>
                    </>
                  }
                  connectSlot={<ConnectButton userId={u.id} initial="connected" />}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── requests tab ───────────────────────────────────────── */}
      {tab === 'requests' && (
        <>
          {requests === null ? (
            <PageLoader label="Loading requests…" />
          ) : requests.length === 0 ? (
            <Empty icon="📭" message="No pending connection requests." />
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <RequestRow key={req.id} req={req} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── suggestions tab ────────────────────────────────────── */}
      {tab === 'suggestions' && (
        <>
          {suggestions === null ? (
            <PageLoader label="Loading suggestions…" />
          ) : suggestions.length === 0 ? (
            <Empty icon="👥" message="No suggestions right now. Join more tables to meet people!" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {suggestions.map(({ user: u, mutuals }) => (
                <PersonCard
                  key={u.id}
                  user={u}
                  sub={
                    <>
                      {u.city && (
                        <p className="text-muted-foreground mt-0.5 text-xs">📍 {u.city}</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {mutuals} {mutuals === 1 ? 'mutual' : 'mutuals'}
                      </p>
                    </>
                  }
                  connectSlot={<ConnectButton userId={u.id} initial="none" />}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
