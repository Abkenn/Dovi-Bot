import { Skeleton } from '@/components/ui/skeleton';

export const MusicSkeleton = ({ searching }: { searching: boolean }) => (
  <section role="status" aria-label="Loading music" aria-busy="true">
    {searching ? (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-4 w-20" />
        </div>
        {['first', 'second', 'third', 'fourth'].map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-4 border-b p-4 last:border-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        {['track', 'series'].map((key) => (
          <div key={key} className="space-y-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )}
  </section>
);
