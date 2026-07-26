import type { PropsWithChildren } from 'react';

type CenteredShellProps = PropsWithChildren;

export const CenteredShell = ({ children }: CenteredShellProps) => (
  <main className="grid min-h-svh place-content-center px-6 text-center">
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      {children}
    </div>
  </main>
);
