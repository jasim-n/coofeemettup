'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Map libraries touch window/document — load client-only.
const EventsMap = dynamic(() => import('@/components/events-map'), { ssr: false });

export default function MapPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Near you</p>
          <h1 className="display mt-1 text-3xl">Meetup map</h1>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/events" className="text-primary hover:underline">
            List view
          </Link>
          <Link href="/" className="text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
      </div>
      <EventsMap />
    </main>
  );
}
