import type { ReactNode } from 'react';
import { AnimatedNumber } from '@/components/animated-number';
import { Card, CardContent } from '@/components/ui/card';

type LiveTotalCardProps = {
  icon: ReactNode;
  value: number;
  label: string;
  cacheKey: string;
  suffix?: string;
  fallback?: string;
};

export const LiveTotalCard = ({
  icon,
  value,
  label,
  cacheKey,
  suffix,
  fallback,
}: LiveTotalCardProps) => (
  <Card className="activity-compact:rounded-lg gap-0 py-0">
    <CardContent className="activity-compact:!p-2 flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="activity-compact:hidden grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div className="min-w-0">
        {fallback ? (
          <span className="activity-compact:!text-base block text-lg font-bold tracking-tight sm:text-2xl">
            {fallback}
          </span>
        ) : (
          <AnimatedNumber
            value={value}
            cacheKey={cacheKey}
            suffix={suffix}
            className="activity-compact:!text-xl block text-2xl font-bold tracking-tight tabular-nums sm:text-4xl"
          />
        )}
        <span className="activity-compact:!text-[0.55rem] text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs sm:tracking-[0.12em]">
          {label}
        </span>
      </div>
    </CardContent>
  </Card>
);
