import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type CardDescriptionProps = ComponentProps<'div'>;

export const CardDescription = ({
  className,
  ...props
}: CardDescriptionProps) => (
  <div
    data-slot="card-description"
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
);
