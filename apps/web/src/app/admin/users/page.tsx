'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError, type AdminUserDto } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader, Spinner } from '@/components/spinner';

type UserMap = Record<string, AdminUserDto>;
type BusyMap = Record<string, boolean>;

function statusBadge(status: AdminUserDto['status']) {
  if (status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
  if (status === 'SUSPENDED') return <Badge variant="warning">Suspended</Badge>;
  return <Badge variant="destructive">Banned</Badge>;
}

function roleBadge(role: AdminUserDto['role']) {
  if (role === 'ADMIN')
    return (
      <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300">Admin</Badge>
    );
  if (role === 'ORGANIZER')
    return (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300">Organizer</Badge>
    );
  return <Badge variant="secondary">User</Badge>;
}

function displayName(u: AdminUserDto) {
  if (u.firstName) return `${u.firstName}${u.lastInitial ? ` ${u.lastInitial}.` : ''}`;
  return u.phone;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ORGANIZER');

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserMap>({});
  const [order, setOrder] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState<BusyMap>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(q: string) {
    setFetching(true);
    setGlobalError(null);
    try {
      const res = await api.adminListUsers(q);
      const map: UserMap = {};
      const ids: string[] = [];
      for (const u of res.users) {
        map[u.id] = u;
        ids.push(u.id);
      }
      setUsers(map);
      setOrder(ids);
      setTotal(res.total);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      setFetching(true);
      setGlobalError(null);
      try {
        const res = await api.adminListUsers('');
        if (!active) return;
        const map: UserMap = {};
        const ids: string[] = [];
        for (const u of res.users) {
          map[u.id] = u;
          ids.push(u.id);
        }
        setUsers(map);
        setOrder(ids);
        setTotal(res.total);
      } catch (err) {
        if (active) setGlobalError(err instanceof ApiError ? err.message : 'Failed to load users');
      } finally {
        if (active) setFetching(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(val), 300);
  }

  function setBusyFor(id: string, value: boolean) {
    setBusy((prev) => ({ ...prev, [id]: value }));
  }

  function setError(id: string, msg: string | null) {
    setRowError((prev) => {
      if (msg === null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: msg };
    });
  }

  function updateUser(u: AdminUserDto) {
    setUsers((prev) => ({ ...prev, [u.id]: u }));
  }

  async function handleSetStatus(
    u: AdminUserDto,
    status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  ) {
    const label = status === 'ACTIVE' ? 'reactivate' : status === 'SUSPENDED' ? 'suspend' : 'ban';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${displayName(u)}?`)) return;
    setBusyFor(u.id, true);
    setError(u.id, null);
    try {
      const updated = await api.adminSetUserStatus(u.id, status);
      updateUser(updated);
    } catch (err) {
      setError(u.id, err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyFor(u.id, false);
    }
  }

  async function handleSetRole(u: AdminUserDto, role: 'USER' | 'ORGANIZER' | 'ADMIN') {
    if (role === u.role) return;
    const toAdmin = role === 'ADMIN';
    const fromAdmin = u.role === 'ADMIN';
    if ((toAdmin || fromAdmin) && !window.confirm(`Change role of ${displayName(u)} to ${role}?`)) return;
    setBusyFor(u.id, true);
    setError(u.id, null);
    try {
      const updated = await api.adminSetUserRole(u.id, role);
      updateUser(updated);
    } catch (err) {
      setError(u.id, err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyFor(u.id, false);
    }
  }

  async function handleToggleHost(u: AdminUserDto) {
    setBusyFor(u.id, true);
    setError(u.id, null);
    try {
      const res = await api.adminSetHost(u.id, !u.canHost);
      // adminSetHost returns partial; patch into existing dto
      updateUser({ ...u, canHost: (res as { canHost: boolean }).canHost });
    } catch (err) {
      setError(u.id, err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyFor(u.id, false);
    }
  }

  async function handleRevokeVerification(u: AdminUserDto) {
    if (!window.confirm(`Revoke verification for ${displayName(u)}?`)) return;
    setBusyFor(u.id, true);
    setError(u.id, null);
    try {
      const updated = await api.adminRevokeVerification(u.id);
      updateUser(updated);
    } catch (err) {
      setError(u.id, err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyFor(u.id, false);
    }
  }

  if (loading) return <PageLoader />;
  if (!isAdmin)
    return (
      <main className="p-6 text-sm">
        Admins only.{' '}
        <Link href="/" className="underline">
          Home
        </Link>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 lg:px-12 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow text-primary">Console</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Users</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/admin/cafes" className="text-primary hover:underline">
            Cafes
          </Link>
          <Link href="/admin/tables" className="text-primary hover:underline">
            Tables
          </Link>
          <Link href="/admin/users" className="text-primary hover:underline">
            Users
          </Link>
          <Link href="/admin/activity" className="text-muted-foreground hover:underline">
            Activity
          </Link>
          <Link href="/admin/verifications" className="text-muted-foreground hover:underline">
            Verifications
          </Link>
          <Link href="/admin/reports" className="text-muted-foreground hover:underline">
            Reports
          </Link>
        </nav>
      </div>

      {/* Search + count */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-sm">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search name, email, phone…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </div>
        {fetching && <Spinner className="text-primary size-4" />}
        {!fetching && (
          <span className="text-muted-foreground text-sm">
            {total} {total === 1 ? 'user' : 'users'}
          </span>
        )}
      </div>

      {globalError && (
        <p className="text-destructive mb-4 text-sm">{globalError}</p>
      )}

      {/* Empty */}
      {!fetching && order.length === 0 && !globalError && (
        <div className="rounded-3xl border border-dashed py-12 text-center">
          <p className="text-3xl">
            <i className="fa-solid fa-users text-muted-foreground" />
          </p>
          <p className="text-muted-foreground mt-2 text-sm">No users found.</p>
        </div>
      )}

      {/* User list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {order.map((id) => {
          const u = users[id];
          if (!u) return null;
          const isBusy = !!busy[id];
          const err = rowError[id];
          const name = displayName(u);

          return (
            <Card key={u.id} className="rounded-3xl shadow-soft">
              <CardContent className="py-4">
                {/* Row: avatar + identity + badges */}
                <div className="flex items-start gap-3">
                  <Avatar name={name} src={u.photoUrl} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-heading font-bold tracking-tight truncate">{name}</span>
                      {statusBadge(u.status)}
                      {roleBadge(u.role)}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">
                      {u.email ?? '—'} · {u.phone}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {u.canHost && (
                        <span className="text-xs text-primary font-semibold">
                          <i className="fa-solid fa-mug-hot mr-1" />
                          Host
                        </span>
                      )}
                      {u.verificationStatus === 'VERIFIED' && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                          <i className="fa-solid fa-shield-check mr-1" />
                          Verified
                        </span>
                      )}
                      {u.city && (
                        <span className="text-xs text-muted-foreground">
                          <i className="fa-solid fa-location-dot mr-1" />
                          {u.city}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Score: {u.reliabilityScore}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inline error */}
                {err && (
                  <p className="text-destructive text-xs mt-2 font-medium">{err}</p>
                )}

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Status actions */}
                  {u.status === 'ACTIVE' && (
                    <>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => void handleSetStatus(u, 'SUSPENDED')}
                      >
                        Suspend
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={isBusy}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => void handleSetStatus(u, 'BANNED')}
                      >
                        Ban
                      </Button>
                    </>
                  )}
                  {(u.status === 'SUSPENDED' || u.status === 'BANNED') && (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isBusy}
                      className="text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => void handleSetStatus(u, 'ACTIVE')}
                    >
                      Reactivate
                    </Button>
                  )}

                  {/* Role select */}
                  <select
                    disabled={isBusy}
                    value={u.role}
                    onChange={(e) =>
                      void handleSetRole(u, e.target.value as 'USER' | 'ORGANIZER' | 'ADMIN')
                    }
                    className="h-6 rounded-md border border-border bg-card px-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                  >
                    <option value="USER">User</option>
                    <option value="ORGANIZER">Organizer</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  {/* Host toggle */}
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleToggleHost(u)}
                  >
                    <i className={`fa-solid fa-mug-hot mr-1 ${u.canHost ? 'text-destructive' : 'text-primary'}`} />
                    {u.canHost ? 'Revoke host' : 'Grant host'}
                  </Button>

                  {/* Revoke verification */}
                  {u.verificationStatus === 'VERIFIED' && (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isBusy}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => void handleRevokeVerification(u)}
                    >
                      <i className="fa-solid fa-shield-xmark mr-1" />
                      Revoke verification
                    </Button>
                  )}

                  {/* View profile */}
                  <Link
                    href={`/u/${u.id}`}
                    className="text-xs font-semibold text-primary hover:underline ml-auto"
                  >
                    View →
                  </Link>

                  {isBusy && <Spinner className="text-primary size-3" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
