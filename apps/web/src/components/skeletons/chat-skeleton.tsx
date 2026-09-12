import { Skeleton } from '@/components/ui/skeleton';

export function ChatSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="bg-card shadow-soft flex min-h-[60dvh] flex-1 flex-col rounded-3xl border p-4">
        <div className="flex-1 space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className={`h-10 rounded-2xl ${i % 2 ? 'w-2/5' : 'w-1/2'}`} />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-full" />
      </div>
    </main>
  );
}
