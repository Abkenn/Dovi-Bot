import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const NativeSelect = ({
  className,
  ...props
}: ComponentProps<'select'>) => (
  <select
    data-slot="native-select"
    className={cn(
      'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
      className,
    )}
    {...props}
  />
);
