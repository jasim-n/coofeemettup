'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, type ChatMessage, type TableDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { PageLoader } from '@/components/spinner';
import { formatDateTime } from '@/lib/format';

const POLL_MS = 10_000;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

export default function MessagesPage() {
  const { user, loading } = useAuth();

  const [conversations, setConversations] = useState<TableDto[]>([]);
  const [convoLoading, setConvoLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [member, setMember] = useState<boolean | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const endRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- load conversations ----
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [joined, hosted] = await Promise.all([
          api.myJoinedTables(),
          user.canHost ? api.myHostedTables() : Promise.resolve([] as TableDto[]),
        ]);
        if (!active) return;
        const approved = joined.filter((t) => t.myRequestStatus === 'APPROVED');
        const seen = new Set<string>();
        const merged: TableDto[] = [];
        for (const t of [...hosted, ...approved]) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            merged.push(t);
          }
        }
        setConversations(merged);
        if (merged.length > 0 && !selectedId) {
          setSelectedId(merged[0]!.id);
        }
      } finally {
        if (active) setConvoLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---- load + poll chat for selected table ----
  useEffect(() => {
    if (!selectedId || !user) return;

    let active = true;

    async function fetchChat(initial?: boolean) {
      if (!selectedId) return;
      if (initial) {
        setChatLoading(true);
        setMessages([]);
        setMember(null);
        setSendError(null);
      }
      try {
        const res = await api.tableChat(selectedId);
        if (active) {
          setMember(res.member);
          setMessages(res.messages);
        }
      } finally {
        if (initial && active) setChatLoading(false);
      }
    }

    void fetchChat(true);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => void fetchChat().catch(() => undefined), POLL_MS);

    return () => {
      active = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- scroll to bottom on new messages ----
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !selectedId) return;
    setSending(true);
    setSendError(null);
    try {
      await api.sendTableMessage(selectedId, text);
      setBody('');
      const res = await api.tableChat(selectedId);
      setMessages(res.messages);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  const filtered = search.trim()
    ? conversations.filter((t) =>
        (t.title ?? t.category).toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const selected = conversations.find((t) => t.id === selectedId) ?? null;
  const memberCount = selected ? selected.seats - selected.seatsLeft + 1 : 0;
  const venue = selected
    ? (selected.venueName ?? selected.cafe?.name ?? selected.venueAddress ?? 'TBD')
    : '';

  // stub presence: collect up to 5 distinct hosts
  const presenceHosts = Array.from(
    new Map(
      conversations
        .filter((t) => t.host?.firstName)
        .map((t) => [t.hostId, t.host!]),
    ).values(),
  ).slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-4">
      <div className="grid gap-4 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[330px_1fr_300px]">
        {/* ========== LEFT — conversations panel ========== */}
        <aside className="bg-card shadow-soft flex flex-col overflow-hidden rounded-3xl border">
          {/* header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h1 className="font-heading text-lg font-bold tracking-tight">Messages</h1>
            <button
              className="text-muted-foreground hover:text-primary grid size-8 place-items-center rounded-xl transition-colors"
              aria-label="Compose"
            >
              <i className="fa-solid fa-pen-to-square" />
            </button>
          </div>

          {/* search */}
          <div className="px-4 py-2">
            <div className="bg-muted flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground shrink-0 text-xs" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="bg-transparent w-full outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* tabs (visual only — All is active) */}
          <div className="flex gap-1 border-b px-4 pb-2">
            {(['All', 'Unread', 'Groups'] as const).map((tab) => (
              <span
                key={tab}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  tab === 'All'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          {/* conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convoLoading ? (
              <div className="text-muted-foreground grid h-full place-items-center py-8 text-sm">
                <span>Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-muted-foreground grid place-items-center py-12 text-center text-sm">
                {search ? (
                  <p>No matches for &ldquo;{search}&rdquo;</p>
                ) : (
                  <div className="px-6">
                    <i className="fa-regular fa-comment-dots mb-3 block text-2xl" />
                    <p className="mb-2 font-medium">No conversations yet</p>
                    <p className="mb-4 text-xs">Join a table to start chatting</p>
                    <Link
                      href="/tables"
                      className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-semibold"
                    >
                      Browse tables
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((t) => {
                  const isSelected = t.id === selectedId;
                  const subtitle =
                    t.venueName ?? t.cafe?.name ?? `${t.seats - t.seatsLeft} members`;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                          isSelected ? 'border-primary bg-secondary/40 border-l-2' : 'border-l-2 border-transparent'
                        }`}
                      >
                        <Avatar name={t.title ?? t.category} size={42} />
                        <div className="min-w-0 flex-1">
                          <p className="font-heading truncate text-sm font-bold tracking-tight">
                            {t.title ?? t.category}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
                        </div>
                        {/* stub: unread dot */}
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-muted-foreground text-[10px]"></span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* archived button */}
          <div className="border-t px-4 py-3">
            <button className="text-muted-foreground w-full text-center text-xs font-medium hover:underline">
              View archived chats
            </button>
          </div>
        </aside>

        {/* ========== CENTER — thread ========== */}
        {selected ? (
          <section className="bg-card shadow-soft flex flex-col overflow-hidden rounded-3xl border">
            {/* thread header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Avatar name={selected.title ?? selected.category} size={38} />
              <div className="flex-1 min-w-0">
                <p className="font-heading truncate font-bold tracking-tight">
                  {selected.title ?? selected.category}
                </p>
                <p className="text-muted-foreground text-xs">
                  Group · {memberCount} member{memberCount === 1 ? '' : 's'}{' '}
                  <span className="text-primary font-semibold">● Active</span>
                </p>
              </div>
              <Link
                href={`/tables/${selected.id}`}
                className="text-muted-foreground hover:text-primary shrink-0 text-xs font-semibold transition-colors"
              >
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </Link>
            </div>

            {/* meetup context card */}
            <div className="border-b px-4 py-3">
              <div className="bg-muted/50 flex items-center gap-3 rounded-2xl p-3">
                <Cover
                  category={selected.category}
                  className="h-16 w-24 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-heading truncate text-sm font-bold tracking-tight">
                    {selected.title ?? selected.category}
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    📍 {venue}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    🗓️ {formatDateTime(selected.startAt)}
                  </p>
                </div>
                <Link
                  href={`/tables/${selected.id}`}
                  className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform hover:-translate-y-0.5"
                >
                  View Meetup
                </Link>
              </div>
            </div>

            {/* messages area */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatLoading ? (
                <div className="text-muted-foreground grid h-full place-items-center text-sm">
                  <span>Loading messages…</span>
                </div>
              ) : member === false ? (
                <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
                  <p>💬 Only the host and approved guests can chat here.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
                  <p>No messages yet — say hi! 👋</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-semibold">Today</span>
                    <div className="bg-border h-px flex-1" />
                  </div>
                  {messages.map((m) => {
                    const mine = m.userId === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!mine && (
                          <Avatar
                            name={m.firstName ?? 'Member'}
                            size={28}
                            className="mb-0.5 shrink-0"
                          />
                        )}
                        <div
                          className={`flex max-w-[72%] flex-col ${mine ? 'items-end' : 'items-start'}`}
                        >
                          {!mine && (
                            <span className="text-muted-foreground mb-0.5 px-1 text-[10px] font-semibold">
                              {m.firstName ?? 'Member'}
                            </span>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                              mine
                                ? 'bg-secondary text-secondary-foreground rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            }`}
                          >
                            {m.body}
                          </div>
                          <div className="text-muted-foreground/70 mt-0.5 flex items-center gap-1 px-1 text-[10px]">
                            <span>{fmtTime(m.createdAt)}</span>
                            {mine && <i className="fa-solid fa-check-double text-primary" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={endRef} />
            </div>

            {/* composer */}
            {member && (
              <form
                onSubmit={(e) => void send(e)}
                className="border-t px-4 py-3"
              >
                {sendError && (
                  <p className="text-destructive mb-2 text-xs">{sendError}</p>
                )}
                <div className="bg-muted flex items-center gap-2 rounded-2xl px-3 py-2">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    aria-label="Attach file"
                  >
                    <i className="fa-solid fa-paperclip text-sm" />
                  </button>
                  <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send(e as unknown as React.FormEvent);
                      }
                    }}
                    placeholder="Type a message…"
                    maxLength={1000}
                    disabled={sending}
                    className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    aria-label="Emoji"
                  >
                    <i className="fa-solid fa-face-smile text-sm" />
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <i className="fa-solid fa-paper-plane text-xs" />
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <section className="bg-card shadow-soft grid place-items-center rounded-3xl border">
            <div className="text-muted-foreground text-center">
              <i className="fa-regular fa-comment-dots mb-3 block text-4xl" />
              <p className="font-heading font-bold tracking-tight">Select a conversation</p>
              <p className="mt-1 text-sm">Pick a table chat from the left to get started</p>
            </div>
          </section>
        )}

        {/* ========== RIGHT RAIL ========== */}
        <aside className="space-y-4 overflow-y-auto">
          {/* active now (presence stub) */}
          {presenceHosts.length > 0 && (
            <div className="bg-card shadow-soft rounded-3xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-heading text-sm font-bold tracking-tight">Active now</p>
                <button className="text-primary text-xs font-semibold hover:underline">See all</button>
              </div>
              <div className="flex gap-2">
                {presenceHosts.map((host) => (
                  <Avatar
                    key={host.id}
                    name={host.firstName ?? 'Host'}
                    size={36}
                    online
                  />
                ))}
              </div>
            </div>
          )}

          {/* group chats */}
          {conversations.length > 0 && (
            <div className="bg-card shadow-soft rounded-3xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-heading text-sm font-bold tracking-tight">Group chats</p>
                <button className="text-primary text-xs font-semibold hover:underline">See all</button>
              </div>
              <ul className="space-y-2">
                {conversations.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <Avatar name={t.title ?? t.category} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading truncate text-xs font-bold tracking-tight">
                          {t.title ?? t.category}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {formatDateTime(t.startAt)}
                        </p>
                      </div>
                      {/* stub unread dot */}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* quick actions */}
          <div className="bg-card shadow-soft rounded-3xl border p-4">
            <p className="font-heading mb-3 text-sm font-bold tracking-tight">Quick actions</p>
            <ul className="space-y-1">
              <li>
                <button className="text-muted-foreground hover:text-foreground flex w-full items-center gap-3 rounded-xl p-2 text-sm transition-colors hover:bg-muted/50">
                  <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-lg">
                    <i className="fa-solid fa-comment text-xs" />
                  </span>
                  New Message
                </button>
              </li>
              <li>
                <Link
                  href="/tables/new"
                  className="text-muted-foreground hover:text-foreground flex w-full items-center gap-3 rounded-xl p-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-lg">
                    <i className="fa-solid fa-user-group text-xs" />
                  </span>
                  Create Group
                </Link>
              </li>
              <li>
                <Link
                  href="/invite"
                  className="text-muted-foreground hover:text-foreground flex w-full items-center gap-3 rounded-xl p-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-lg">
                    <i className="fa-solid fa-user-plus text-xs" />
                  </span>
                  Invite Friends
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
