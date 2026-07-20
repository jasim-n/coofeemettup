'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError, type ChatMessage } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const POLL_MS = 6000;

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const res = await api.eventChat(id);
    setGroupId(res.groupId);
    setMessages(res.messages);
    setReady(true);
  }, [id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load chat');
      }
    })();
    const timer = setInterval(() => {
      void load().catch(() => undefined);
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user, load]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  if (!user)
    return (
      <main className="p-6 text-sm">
        Please <Link href="/login" className="underline">sign in</Link> first.
      </main>
    );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      await api.sendChatMessage(id, text);
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between px-2">
        <div>
          <p className="eyebrow text-primary">Your group</p>
          <h1 className="font-heading text-xl font-bold tracking-tight">Group chat</h1>
        </div>
        <Link href="/meetups" className="text-muted-foreground text-sm font-semibold hover:underline">
          ← Meetups
        </Link>
      </div>

      {error && <p className="text-destructive px-2 pb-2 text-sm">{error}</p>}

      <div className="bg-card flex-1 space-y-3 overflow-y-auto rounded-3xl border p-4 shadow-soft">
        {ready && groupId === null && (
          <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
            <p>
              💬 Chat opens once your group is formed.
              <br />
              Check back after matching.
            </p>
          </div>
        )}
        {ready && groupId && messages.length === 0 && (
          <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
            <p>No messages yet — say hi 👋</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.userId === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!mine && (
                  <span className="text-muted-foreground mb-0.5 px-1 text-xs font-semibold">
                    {m.firstName ?? 'Member'} {m.lastInitial ?? ''}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  {m.body}
                </div>
                <span className="text-muted-foreground/70 mt-0.5 px-1 text-[10px]">
                  {new Date(m.createdAt).toLocaleTimeString('en-PK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {groupId && (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message your group…"
            maxLength={1000}
          />
          <Button type="submit" disabled={sending || !body.trim()}>
            Send
          </Button>
        </form>
      )}
    </main>
  );
}
