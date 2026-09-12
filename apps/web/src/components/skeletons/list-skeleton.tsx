import { Skeleton } from '@/components/ui/skeleton';

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-border/60 divide-y">
      {Array.from({ length: rows }, (_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}
