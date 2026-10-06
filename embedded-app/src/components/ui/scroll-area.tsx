import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const ScrollArea = ({
  className,
  children,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Root>) => (
  <ScrollAreaPrimitive.Root
    data-slot="scroll-area"
    className={cn('relative min-h-0 min-w-0', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      className="size-full rounded-[inherit] overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ScrollAreaPrimitive.Content
        data-slot="scroll-area-content"
        className="min-w-0"
        style={{ minWidth: 0 }}
      >
        {children}
      </ScrollAreaPrimitive.Content>
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation="vertical"
      className="absolute inset-y-0 right-0 z-20 flex w-2.5 touch-none p-0.5 select-none"
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="flex-1 rounded-full bg-muted-foreground/35 transition-colors hover:bg-muted-foreground/60 active:bg-primary/60"
      />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
);
