import type * as React from 'react';
import { cn } from '@/lib/utils';

type SkeletonProps = React.ComponentProps<'div'>;

export const Skeleton = ({ className, ...props }: SkeletonProps) => (
  <div
    data-slot="skeleton"
    className={cn('bg-accent animate-pulse rounded-md', className)}
    {...props}
  />
);
