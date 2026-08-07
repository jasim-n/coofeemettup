'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { type ConnectionState } from '@jrst/api-client';

export function ConnectButton({
  userId,
  initial = 'none',
  size = 'sm',
}: {
  userId: string;
  initial?: ConnectionState;
  size?: 'sm' | 'xs';
}) {
  const [state, setState] = useState<ConnectionState>(initial);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ status: ConnectionState }>) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      setState(r.status);
    } catch {
      // best-effort
    } finally {
      setBusy(false);
    }
  };

  const pad = size === 'xs' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

  if (state === 'connected')
    return (
      <button
        onClick={() => run(() => api.removeConnection(userId))}
        disabled={busy}
        className={`rounded-full font-semibold ring-1 ring-border/60 bg-card ${pad}`}
      >
        ✓ Connected
      </button>
    );

  if (state === 'pending_sent')
    return (
      <button disabled className={`rounded-full font-semibold bg-muted text-muted-foreground ${pad}`}>
        Requested
      </button>
    );

  if (state === 'pending_received')
    return (
      <span className="flex gap-1">
        <button
          onClick={() => run(() => api.acceptConnection(userId))}
          disabled={busy}
          className={`rounded-full font-semibold bg-primary text-primary-foreground ${pad}`}
        >
          Accept
        </button>
        <button
          onClick={() => run(() => api.declineConnection(userId))}
          disabled={busy}
          className={`rounded-full font-semibold ring-1 ring-border/60 ${pad}`}
        >
          Decline
        </button>
      </span>
    );

  return (
    <button
      onClick={() => run(() => api.requestConnection(userId))}
      disabled={busy}
      className={`rounded-full font-semibold ring-1 ring-primary/40 text-primary hover:bg-secondary ${pad}`}
    >
      + Connect
    </button>
  );
}
