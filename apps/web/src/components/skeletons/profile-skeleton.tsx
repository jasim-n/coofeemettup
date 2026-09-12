import { Skeleton } from '@/components/ui/skeleton';

export function ProfileSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1508px] flex-1 px-4 py-8 sm:px-6 lg:px-12">
      <div className="bg-card shadow-soft overflow-hidden rounded-3xl border">
        <Skeleton className="h-36 w-full rounded-none sm:h-44" />
        <div className="relative px-6 pb-6">
          <Skeleton className="-mt-10 size-20 rounded-full border-4 border-card" />
          <Skeleton className="mt-4 h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
          <Skeleton className="mt-4 h-16 w-full max-w-xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    </main>
  );
}
