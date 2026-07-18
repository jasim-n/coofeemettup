'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Map libraries touch window/document — load client-only.
const EventsMap = dynamic(() => import('@/components/events-map'), { ssr: false });

export default function MapPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Meetups near you</h1>
        <Link href="/events" className="text-muted-foreground text-sm hover:underline">
          List view
        </Link>
      </div>
      <EventsMap />
    </main>
  );
}
