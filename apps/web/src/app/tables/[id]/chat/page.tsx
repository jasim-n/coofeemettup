'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError, type ChatMessage } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/spinner';
import { UserLink } from '@/components/user-link';

const POLL_MS = 6000;
const QUICK_EMOJIS = ['❤️', '👍', '😂', '🎉', '☕', '😮'];

export default function TableChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [member, setMember] = useState<boolean | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reactPickerId, setReactPickerId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function toggleReaction(messageId: string, emoji: string) {
    try {
      const updated = await api.toggleReaction('group', messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: updated } : m)),
      );
      setReactPickerId(null);
    } catch {
      /* best-effort */
    }
  }

  const load = useCallback(async () => {
    const res = await api.tableChat(id);
    setMember(res.member);
    setMessages(res.messages);
    if (res.member) void api.markGroupRead(id).catch(() => undefined);
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
    const timer = setInterval(() => void load().catch(() => undefined), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) return <PageLoader />;
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
      await api.sendTableMessage(id, text);
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-[1508px] flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between px-2">
        <div>
          <p className="eyebrow text-primary">Table</p>
          <h1 className="font-heading text-xl font-bold tracking-tight">Group chat</h1>
        </div>
        <Link href={`/tables/${id}`} className="text-muted-foreground text-sm font-semibold hover:underline">
          ← Table
        </Link>
      </div>

      {error && <p className="text-destructive px-2 pb-2 text-sm">{error}</p>}

      <div className="bg-card flex-1 space-y-3 overflow-y-auto rounded-3xl border p-4 shadow-soft">
        {member === false && (
          <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
            <p><i className="fa-solid fa-comment mr-1" />Only the host and approved guests can chat here.</p>
          </div>
        )}
        {member && messages.length === 0 && (
          <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
            <p>No messages yet — say hi 👋</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.userId === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                {!mine && (
                  <UserLink userId={m.userId} className="text-muted-foreground mb-0.5 px-1 text-xs font-semibold">
                    {m.firstName ?? 'Member'} {m.lastInitial ?? ''}
                  </UserLink>
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
                <div className="mt-0.5 flex items-center gap-2 px-1">
                  <span className="text-muted-foreground/70 text-[10px]">
                    {new Date(m.createdAt).toLocaleTimeString('en-PK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setReactPickerId(reactPickerId === m.id ? null : m.id)}
                      className="text-muted-foreground/60 hover:text-primary text-[11px]"
                      aria-label="React"
                    >
                      <i className="fa-regular fa-face-smile" />
                    </button>
                    {reactPickerId === m.id && (
                      <div
                        className={`bg-card shadow-soft absolute bottom-5 z-10 flex gap-1 rounded-full border px-2 py-1 ${
                          mine ? 'right-0' : 'left-0'
                        }`}
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => void toggleReaction(m.id, emoji)}
                            className="rounded-full p-0.5 text-base transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {m.reactions && m.reactions.length > 0 && (
                  <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => void toggleReaction(m.id, r.emoji)}
                        className={`rounded-full px-2 py-0.5 text-xs ring-1 transition-colors ${
                          r.mine
                            ? 'bg-secondary text-primary ring-primary/40 font-semibold'
                            : 'bg-card text-muted-foreground ring-border/60'
                        }`}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {member && (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message the table…"
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
