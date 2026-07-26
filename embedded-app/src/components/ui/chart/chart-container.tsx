import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    color?: string;
  }
>;

type ChartContainerProps = ComponentProps<'div'> & {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>['children'];
};

export const ChartContainer = ({
  config,
  className,
  children,
  style,
  ...props
}: ChartContainerProps) => {
  const chartVariables = Object.fromEntries(
    Object.entries(config).flatMap(([key, item]) =>
      item.color ? [[`--color-${key}`, item.color]] : [],
    ),
  ) as CSSProperties;

  return (
    <div
      data-slot="chart"
      className={cn(
        'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none',
        className,
      )}
      style={{ ...chartVariables, ...style }}
      {...props}
    >
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
};
