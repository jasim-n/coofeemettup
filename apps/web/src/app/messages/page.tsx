'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { PageLoader } from '@/components/spinner';

export default function MessagesPage() {
  const { user, loading } = useAuth();
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-6">
        <p className="eyebrow text-primary">Conversations</p>
        <h1 className="display mt-1 text-3xl">Messages</h1>
      </div>
      <div className="bg-card shadow-soft grid place-items-center rounded-3xl border py-24 text-center">
        <span className="bg-secondary text-primary grid size-16 place-items-center rounded-2xl text-2xl">
          <i className="fa-regular fa-comment-dots" />
        </span>
        <p className="font-heading mt-4 text-lg font-bold tracking-tight">Messaging is coming soon</p>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          For now, chat with your table right from its page once you’re in. Direct messages and
          group chats land here next.
        </p>
        <Link
          href="/meetups"
          className="bg-primary text-primary-foreground mt-5 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
        >
          Go to your tables
        </Link>
      </div>
    </main>
  );
}
