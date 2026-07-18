'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const res = await api.notifications();
        if (active) setUnread(res.unread);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2 text-center">
        <Wordmark className="text-muted-foreground text-base" />
        <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight">
          Find your people <span className="text-gradient-hero">over coffee</span>
        </h1>
        <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
          Islamabad · Lahore
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center text-sm">Loading…</p>
      ) : user ? (
        <div className="space-y-4 rounded-xl border p-6 text-center">
          <p className="text-sm">
            Signed in as <span className="font-medium">{user.phone}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Role: {user.role} · Verification: {user.verificationStatus} · Reliability:{' '}
            {user.reliabilityScore}
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/events" className={buttonVariants({ className: 'w-full' })}>
              Browse meetups
            </Link>
            <Link href="/meetups" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
              My meetups
            </Link>
            <Link
              href="/notifications"
              className={buttonVariants({ variant: 'outline', className: 'w-full justify-center gap-2' })}
            >
              Notifications
              {unread > 0 && (
                <span className="bg-primary text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                  {unread}
                </span>
              )}
            </Link>
            <Link href="/profile" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
              Edit profile
            </Link>
            {(user.role === 'ADMIN' || user.role === 'ORGANIZER') && (
              <Link href="/admin" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
                Admin console
              </Link>
            )}
            <Button variant="ghost" onClick={() => void logout()} className="w-full">
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border p-6 text-center">
          <p className="text-sm">You&apos;re not signed in yet.</p>
          <Link href="/login" className={buttonVariants({ className: 'w-full' })}>
            Sign in with your phone
          </Link>
        </div>
      )}
    </main>
  );
}
