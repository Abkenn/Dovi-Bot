import { Activity } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CenteredShell = ({ children }: { children: ReactNode }) => (
  <main className="grid min-h-svh place-content-center px-6 text-center">
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      {children}
    </div>
  </main>
);

export const ActivityLoadingState = () => (
  <CenteredShell>
    <Skeleton className="size-12 rounded-full" />
    <Skeleton className="h-5 w-52" />
    <span className="sr-only">Waking up live stats…</span>
  </CenteredShell>
);

export const ActivityErrorState = ({ message }: { message: string }) => (
  <CenteredShell>
    <Activity className="size-10 text-primary" aria-hidden="true" />
    <p className="text-xs font-bold tracking-[0.24em] text-primary uppercase">
      Dovi
    </p>
    <h1 className="text-3xl font-bold tracking-tight">Stats are resting</h1>
    <p className="text-muted-foreground">{message}</p>
  </CenteredShell>
);
