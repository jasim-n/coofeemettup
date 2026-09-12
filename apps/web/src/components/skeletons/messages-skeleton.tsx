import { Skeleton } from '@/components/ui/skeleton';

export function MessagesSkeleton() {
  return (
    <main className="mx-auto grid w-full max-w-[1508px] flex-1 gap-4 px-4 py-6 lg:grid-cols-[320px_1fr] lg:px-12">
      <div className="bg-card shadow-soft hidden rounded-3xl border p-3 lg:block">
        <Skeleton className="mb-3 h-10 w-full rounded-2xl" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="min-h-[70dvh] w-full rounded-3xl" />
    </main>
  );
}
