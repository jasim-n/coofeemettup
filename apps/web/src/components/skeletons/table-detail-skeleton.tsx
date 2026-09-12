import { Skeleton } from '@/components/ui/skeleton';

export function TableDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 py-8 sm:px-6 lg:px-12">
      <Skeleton className="h-4 w-36" />
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full rounded-3xl sm:h-64" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-4/5 max-w-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
        <aside className="space-y-4">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </aside>
      </div>
    </main>
  );
}
