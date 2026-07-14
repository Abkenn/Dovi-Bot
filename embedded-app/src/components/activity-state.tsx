import { Activity } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CenteredShell = ({ children }: { children: ReactNode }) => (
  <main className="grid min-h-svh place-content-center px-6 text-center">
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      {children}
    </div>
  </main>
);

const loadingItem = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0 },
};

export const ActivityLoadingState = () => (
  <motion.main
    className="activity-compact:h-svh activity-compact:min-h-0 activity-compact:justify-center activity-compact:overflow-hidden activity-compact:!p-3 mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-8 sm:py-12"
    aria-busy="true"
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: 0.035 } },
    }}
  >
    <motion.header
      variants={loadingItem}
      className="flex items-start justify-between gap-3 sm:pb-3"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56 sm:h-14 sm:w-96" />
      </div>
      <Skeleton className="h-7 w-28 rounded-full" />
    </motion.header>
    <motion.nav
      variants={loadingItem}
      className="activity-compact:hidden flex gap-2 overflow-hidden"
      aria-hidden="true"
    >
      <Skeleton className="h-8 w-16 shrink-0 rounded-md" />
      <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
      <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
      <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
    </motion.nav>
    <motion.section
      variants={loadingItem}
      className="grid grid-cols-2 gap-3"
      aria-hidden="true"
    >
      <Skeleton className="h-20 rounded-xl sm:h-28" />
      <Skeleton className="h-20 rounded-xl sm:h-28" />
    </motion.section>
    <motion.section
      variants={loadingItem}
      className="activity-compact:hidden grid gap-3 sm:gap-5"
      aria-hidden="true"
    >
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </motion.section>
    <span className="sr-only">Waking up live stats...</span>
  </motion.main>
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
