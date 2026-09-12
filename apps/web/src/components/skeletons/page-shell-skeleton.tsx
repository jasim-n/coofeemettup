import { Skeleton } from '@/components/ui/skeleton';

/** Generic admin / simple page while data loads. */
export function PageShellSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-12">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full max-w-md rounded-2xl" />
      <div className="bg-card shadow-soft space-y-3 rounded-3xl border p-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
