import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type CardTitleProps = ComponentProps<'div'>;

export const CardTitle = ({ className, ...props }: CardTitleProps) => (
  <div
    data-slot="card-title"
    className={cn('leading-none font-semibold', className)}
    {...props}
  />
);
