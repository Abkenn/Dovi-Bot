import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from '@/lib/utils';

type SeparatorProps = Omit<
  React.ComponentProps<typeof SeparatorPrimitive>,
  'className'
> & {
  className?: string;
  decorative?: boolean;
};

export const Separator = ({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) => (
  <SeparatorPrimitive
    data-slot="separator"
    role={decorative ? 'none' : 'separator'}
    orientation={orientation}
    className={cn(
      'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
      className,
    )}
    {...props}
  />
);
