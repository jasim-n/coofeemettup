'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Map libraries touch window/document — load client-only.
const TablesMap = dynamic(() => import('@/components/tables-map'), { ssr: false });

export default function NearbyTablesPage() {
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow text-primary">Near you</p>
          <h1 className="display mt-1 text-3xl">Nearby tables</h1>
        </div>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/discover" className="text-primary hover:underline">
            Discover
          </Link>
          <Link href="/tables" className="text-primary hover:underline">
            List
          </Link>
          <Link href="/" className="text-muted-foreground hover:underline">
            Home
          </Link>
        </div>
      </div>
      <TablesMap />
    </main>
  );
}
