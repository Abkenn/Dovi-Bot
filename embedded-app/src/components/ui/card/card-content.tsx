import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type CardContentProps = ComponentProps<'div'>;

export const CardContent = ({ className, ...props }: CardContentProps) => (
  <div data-slot="card-content" className={cn('px-6', className)} {...props} />
);
