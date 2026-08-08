'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  type ChatMessage,
  type DmMessage,
  type DmThread,
  type PublicUser,
  type TableDto,
} from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Cover } from '@/components/cover-image';
import { Avatar } from '@/components/avatar';
import { UserLink } from '@/components/user-link';
import { PageLoader } from '@/components/spinner';
import { formatDateTime } from '@/lib/format';

const POLL_MS = 10_000;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

// ---- Unified conversation model ----
type DmConvo = {
  kind: 'dm';
  key: string;
  userId: string;
  name: string;
  last: string;
  time: string;
  unread: number;
};

type GroupConvo = {
  kind: 'group';
  key: string;
  table: TableDto;
  name: string;
  last: string;
  time: string;
  unread: number;
};

type Convo = DmConvo | GroupConvo;

type TabFilter = 'All' | 'Unread' | 'Groups';

export default function MessagesPage() {
  const { user, loading } = useAuth();

  // ---- unified convo list ----
  const [convos, setConvos] = useState<Convo[]>([]);
  const [connections, setConnections] = useState<PublicUser[]>([]);
  const [convoLoading, setConvoLoading] = useState(true);

  // ---- selection — seed from ?dm=<userId> if present ----
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const dm = new URLSearchParams(window.location.search).get('dm');
    return dm ? `dm:${dm}` : null;
  });

  // ---- DM thread state ----
  const [dmMsgs, setDmMsgs] = useState<DmMessage[]>([]);

  // ---- group thread state ----
  const [groupChat, setGroupChat] = useState<{ member: boolean; messages: ChatMessage[] } | null>(
    null,
  );

  // ---- shared loading / send state ----
  const [chatLoading, setChatLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // ---- search + tab ----
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('All');

  // ---- new-message picker ----
  const [pickerOpen, setPickerOpen] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- load all convos + connections ----
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const [threads, joined, hosted, conns] = await Promise.all([
          api.dmThreads(),
          api.myJoinedTables(),
          user.canHost ? api.myHostedTables() : Promise.resolve([] as TableDto[]),
          api.myConnections(),
        ]);
        if (!active) return;

        // build DM convos
        const dmConvos: DmConvo[] = threads.map((t: DmThread) => ({
          kind: 'dm',
          key: `dm:${t.user.id}`,
          userId: t.user.id,
          name: `${t.user.firstName ?? 'Member'} ${t.user.lastInitial ?? ''}`.trim(),
          last: t.lastMessage,
          time: t.lastAt,
          unread: t.unread,
        }));

        // build group convos (deduped)
        const approvedJoined = joined.filter((t) => t.myRequestStatus === 'APPROVED');
        const seen = new Set<string>();
        const groupConvos: GroupConvo[] = [];
        for (const t of [...hosted, ...approvedJoined]) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            groupConvos.push({
              kind: 'group',
              key: `group:${t.id}`,
              table: t,
              name: t.title ?? t.category,
              last: 'Group chat',
              time: t.startAt,
              unread: 0,
            });
          }
        }

        // merge + sort by time desc
        const all: Convo[] = [...dmConvos, ...groupConvos].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        );

        setConvos(all);
        setConnections(conns);
        if (all.length > 0 && !selectedKey) {
          setSelectedKey(all[0]!.key);
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

  // ---- load + poll selected thread ----
  useEffect(() => {
    if (!selectedKey || !user) return;

    let active = true;

    async function fetchThread(initial?: boolean) {
      if (initial) {
        setChatLoading(true);
        setDmMsgs([]);
        setGroupChat(null);
        setSendError(null);
      }
      try {
        if (selectedKey?.startsWith('dm:')) {
          const uid = selectedKey.slice(3);
          const msgs = await api.dmThread(uid);
          if (active) setDmMsgs(msgs);
        } else if (selectedKey?.startsWith('group:')) {
          const tid = selectedKey.slice(6);
          const res = await api.tableChat(tid);
          if (active) setGroupChat(res);
        }
      } finally {
        if (initial && active) setChatLoading(false);
      }
    }

    void fetchThread(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => void fetchThread().catch(() => undefined), POLL_MS);

    return () => {
      active = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // ---- scroll to bottom on new messages ----
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMsgs.length, groupChat?.messages.length]);

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

  // ---- send ----
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !selectedKey) return;
    setSending(true);
    setSendError(null);
    try {
      if (selectedKey.startsWith('dm:')) {
        const uid = selectedKey.slice(3);
        await api.sendDm(uid, text);
        setBody('');
        const msgs = await api.dmThread(uid);
        setDmMsgs(msgs);
      } else if (selectedKey.startsWith('group:')) {
        const tid = selectedKey.slice(6);
        await api.sendTableMessage(tid, text);
        setBody('');
        const res = await api.tableChat(tid);
        setGroupChat(res);
      }
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  // ---- derived ----
  const selected = convos.find((c) => c.key === selectedKey) ?? null;

  const filtered = convos.filter((c) => {
    const matchSearch = search.trim()
      ? c.name.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchTab =
      activeTab === 'All' ||
      (activeTab === 'Unread' && c.unread > 0) ||
      (activeTab === 'Groups' && c.kind === 'group');
    return matchSearch && matchTab;
  });

  const groupConvos = convos.filter((c): c is GroupConvo => c.kind === 'group');

  // presence: connections + group hosts (stub — no real presence data)
  const presencePool: PublicUser[] = connections.slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-4">
      <div className="grid gap-4 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[330px_1fr_300px]">

        {/* ========== LEFT — conversations panel ========== */}
        <aside className="bg-card shadow-soft flex flex-col overflow-hidden rounded-3xl border">
          {/* header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h1 className="font-heading text-lg font-bold tracking-tight">Messages</h1>
            <div className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="text-muted-foreground hover:text-primary grid size-8 place-items-center rounded-xl transition-colors"
                aria-label="New message"
              >
                <i className="fa-solid fa-pen-to-square" />
              </button>
              {/* new-message picker */}
              {pickerOpen && (
                <div className="bg-card shadow-soft absolute right-0 top-10 z-20 w-64 overflow-hidden rounded-2xl border">
                  <div className="border-b px-3 py-2.5">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                      New Message
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {connections.length === 0 ? (
                      <div className="px-4 py-5 text-center text-sm">
                        <p className="text-muted-foreground mb-2">Connect with people first</p>
                        <Link
                          href="/connections"
                          onClick={() => setPickerOpen(false)}
                          className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-semibold"
                        >
                          Find connections
                        </Link>
                      </div>
                    ) : (
                      <ul>
                        {connections.map((person) => {
                          const name =
                            `${person.firstName ?? 'Member'} ${person.lastInitial ?? ''}`.trim();
                          return (
                            <li key={person.id}>
                              <button
                                onClick={() => {
                                  setSelectedKey(`dm:${person.id}`);
                                  setPickerOpen(false);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                              >
                                <Avatar name={name} size={32} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">{name}</p>
                                  {person.city && (
                                    <p className="text-muted-foreground truncate text-xs">
                                      {person.city}
                                    </p>
                                  )}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
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

          {/* tabs */}
          <div className="flex gap-1 border-b px-4 pb-2">
            {(['All', 'Unread', 'Groups'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
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
                    <p className="mb-4 text-xs">Join a table or connect with people</p>
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
              <ul className="divide-y" onClick={() => setPickerOpen(false)}>
                {filtered.map((c) => {
                  const isSelected = c.key === selectedKey;
                  return (
                    <li key={c.key}>
                      <button
                        onClick={() => setSelectedKey(c.key)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                          isSelected
                            ? 'border-primary bg-secondary/40 border-l-2'
                            : 'border-l-2 border-transparent'
                        }`}
                      >
                        <Avatar name={c.name} size={42} />
                        <div className="min-w-0 flex-1">
                          <p className="font-heading truncate text-sm font-bold tracking-tight">
                            {c.name}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {c.kind === 'dm' ? c.last || 'Say hello' : 'Group chat'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-muted-foreground text-[10px]">
                            {c.time ? fmtTime(c.time) : ''}
                          </span>
                          {c.unread > 0 && (
                            <span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* archived */}
          <div className="border-t px-4 py-3">
            <button className="text-muted-foreground w-full text-center text-xs font-medium hover:underline">
              View archived chats
            </button>
          </div>
        </aside>

        {/* ========== CENTER — thread ========== */}
        {selected ? (
          <section
            className="bg-card shadow-soft flex flex-col overflow-hidden rounded-3xl border"
            onClick={() => setPickerOpen(false)}
          >
            {/* thread header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              {selected.kind === 'dm' ? (
                <UserLink userId={(selected as DmConvo).userId} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={selected.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading truncate font-bold tracking-tight">{selected.name}</p>
                    <p className="text-muted-foreground text-xs">
                      <span className="text-primary font-semibold">● Online</span>
                    </p>
                  </div>
                </UserLink>
              ) : (
                <>
                  <Avatar name={selected.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading truncate font-bold tracking-tight">{selected.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Group · {selected.table.seats - selected.table.seatsLeft + 1} member
                      {selected.table.seats - selected.table.seatsLeft + 1 === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link
                    href={`/tables/${selected.table.id}`}
                    className="text-muted-foreground hover:text-primary shrink-0 text-xs font-semibold transition-colors"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </Link>
                </>
              )}
            </div>

            {/* meetup context card — group only */}
            {selected.kind === 'group' && (
              <div className="border-b px-4 py-3">
                <div className="bg-muted/50 flex items-center gap-3 rounded-2xl p-3">
                  <Cover
                    category={selected.table.category}
                    className="h-16 w-24 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading truncate text-sm font-bold tracking-tight">
                      {selected.table.title ?? selected.table.category}
                    </p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
                      <i className="fa-solid fa-location-dot" />
                      {selected.table.venueName ??
                        selected.table.cafe?.name ??
                        selected.table.venueAddress ??
                        'TBD'}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                      <i className="fa-solid fa-calendar-day" />{formatDateTime(selected.table.startAt)}
                    </p>
                  </div>
                  <Link
                    href={`/tables/${selected.table.id}`}
                    className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform hover:-translate-y-0.5"
                  >
                    View Meetup
                  </Link>
                </div>
              </div>
            )}

            {/* messages area */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatLoading ? (
                <div className="text-muted-foreground grid h-full place-items-center text-sm">
                  <span>Loading messages…</span>
                </div>
              ) : selected.kind === 'dm' ? (
                /* ---- DM bubbles ---- */
                dmMsgs.length === 0 ? (
                  <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
                    <p>No messages yet — say hi!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 py-2">
                      <div className="bg-border h-px flex-1" />
                      <span className="text-muted-foreground text-xs font-semibold">Today</span>
                      <div className="bg-border h-px flex-1" />
                    </div>
                    {dmMsgs.map((m) => {
                      const mine = m.senderId === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          {!mine && (
                            <UserLink userId={(selected as DmConvo).userId}>
                              <Avatar name={selected.name} size={28} className="mb-0.5 shrink-0" />
                            </UserLink>
                          )}
                          <div
                            className={`flex max-w-[72%] flex-col ${mine ? 'items-end' : 'items-start'}`}
                          >
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
                              {mine && m.readAt && (
                                <i className="fa-solid fa-check-double text-primary" />
                              )}
                              {mine && !m.readAt && (
                                <i className="fa-solid fa-check text-muted-foreground/50" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )
              ) : /* ---- Group bubbles ---- */
              groupChat === null || groupChat.member === false ? (
                <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
                  <p>Only the host and approved guests can chat here.</p>
                </div>
              ) : groupChat.messages.length === 0 ? (
                <div className="text-muted-foreground grid h-full place-items-center text-center text-sm">
                  <p>No messages yet — say hi!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-semibold">Today</span>
                    <div className="bg-border h-px flex-1" />
                  </div>
                  {groupChat.messages.map((m) => {
                    const mine = m.userId === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!mine && (
                          <UserLink userId={m.userId}>
                            <Avatar
                              name={m.firstName ?? 'Member'}
                              size={28}
                              className="mb-0.5 shrink-0"
                            />
                          </UserLink>
                        )}
                        <div
                          className={`flex max-w-[72%] flex-col ${mine ? 'items-end' : 'items-start'}`}
                        >
                          {!mine && (
                            <UserLink userId={m.userId}>
                              <span className="text-muted-foreground mb-0.5 px-1 text-[10px] font-semibold">
                                {m.firstName ?? 'Member'}
                              </span>
                            </UserLink>
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
            {selected.kind === 'dm' || (selected.kind === 'group' && groupChat?.member) ? (
              <form onSubmit={(e) => void send(e)} className="border-t px-4 py-3">
                {sendError && <p className="text-destructive mb-2 text-xs">{sendError}</p>}
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
            ) : selected.kind === 'group' && groupChat?.member === false ? (
              <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
                You must be an approved member to send messages.
              </div>
            ) : null}
          </section>
        ) : (
          <section
            className="bg-card shadow-soft grid place-items-center rounded-3xl border"
            onClick={() => setPickerOpen(false)}
          >
            <div className="text-muted-foreground text-center">
              <i className="fa-regular fa-comment-dots mb-3 block text-4xl" />
              <p className="font-heading font-bold tracking-tight">Select a conversation</p>
              <p className="mt-1 text-sm">Pick a chat from the left to get started</p>
            </div>
          </section>
        )}

        {/* ========== RIGHT RAIL ========== */}
        <aside className="space-y-4 overflow-y-auto" onClick={() => setPickerOpen(false)}>
          {/* active now (presence stub) */}
          {presencePool.length > 0 && (
            <div className="bg-card shadow-soft rounded-3xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-heading text-sm font-bold tracking-tight">Active now</p>
                <button className="text-primary text-xs font-semibold hover:underline">
                  See all
                </button>
              </div>
              <div className="flex gap-2">
                {presencePool.map((person) => (
                  <UserLink key={person.id} userId={person.id}>
                    <Avatar
                      name={`${person.firstName ?? 'M'} ${person.lastInitial ?? ''}`.trim()}
                      size={36}
                      online
                    />
                  </UserLink>
                ))}
              </div>
            </div>
          )}

          {/* group chats */}
          {groupConvos.length > 0 && (
            <div className="bg-card shadow-soft rounded-3xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-heading text-sm font-bold tracking-tight">Group chats</p>
                <button
                  onClick={() => setActiveTab('Groups')}
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  See all
                </button>
              </div>
              <ul className="space-y-2">
                {groupConvos.slice(0, 6).map((c) => (
                  <li key={c.key}>
                    <button
                      onClick={() => setSelectedKey(c.key)}
                      className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <Avatar name={c.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading truncate text-xs font-bold tracking-tight">
                          {c.name}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {formatDateTime(c.table.startAt)}
                        </p>
                      </div>
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
                <button
                  onClick={() => setPickerOpen((v) => !v)}
                  className="text-muted-foreground hover:text-foreground flex w-full items-center gap-3 rounded-xl p-2 text-sm transition-colors hover:bg-muted/50"
                >
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
