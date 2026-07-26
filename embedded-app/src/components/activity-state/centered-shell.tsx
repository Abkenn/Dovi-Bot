import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type CenteredShellProps = PropsWithChildren<{
  className?: string;
}>;

export const CenteredShell = ({ children, className }: CenteredShellProps) => (
  <main
    className={cn(
      'grid min-h-svh place-content-center px-6 text-center',
      className,
    )}
  >
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      {children}
    </div>
  </main>
);
