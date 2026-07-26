import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type CardProps = ComponentProps<'div'>;

export const Card = ({ className, ...props }: CardProps) => (
  <div
    data-slot="card"
    className={cn(
      'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
      className,
    )}
    {...props}
  />
);
