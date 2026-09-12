import { Skeleton } from '@/components/ui/skeleton';
import { TableCardSkeleton } from '@/components/skeletons/table-card-skeleton';

export function HomeDashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 space-y-8 px-4 py-6 md:py-8 sm:px-6 lg:px-12">
      <Skeleton className="h-48 w-full rounded-3xl md:h-56" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <TableCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
