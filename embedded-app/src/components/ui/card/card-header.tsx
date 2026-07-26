import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type CardHeaderProps = ComponentProps<'div'>;

export const CardHeader = ({ className, ...props }: CardHeaderProps) => (
  <div
    data-slot="card-header"
    className={cn(
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6',
      className,
    )}
    {...props}
  />
);
