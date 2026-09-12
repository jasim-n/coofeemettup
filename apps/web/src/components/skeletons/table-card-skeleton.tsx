import { Skeleton } from '@/components/ui/skeleton';

export function TableCardSkeleton() {
  return (
    <div className="bg-card shadow-soft ring-border/60 overflow-hidden rounded-3xl ring-1">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export function TableCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <TableCardSkeleton key={i} />
      ))}
    </div>
  );
}
