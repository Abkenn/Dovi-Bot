import { ViewTransition } from 'react';
import { Badge } from '@/components/ui/badge';

type StatsPageHeaderProps = {
  eyebrow: string;
  title: string;
  statusIcon: React.ReactNode;
  statusLabel: string;
};

export const StatsPageHeader = ({
  eyebrow,
  title,
  statusIcon,
  statusLabel,
}: StatsPageHeaderProps) => (
  <header className="mobile-pip-hide flex items-start justify-between gap-2 sm:gap-5 sm:pb-3">
    <div className="min-w-0 space-y-1 sm:space-y-2">
      <p className="activity-compact:hidden text-[0.65rem] font-bold tracking-[0.2em] text-primary uppercase sm:text-xs sm:tracking-[0.24em]">
        {eyebrow}
      </p>
      <ViewTransition name="game-title">
        <h1 className="activity-compact:!text-xl text-2xl leading-none font-bold tracking-tight sm:text-6xl">
          {title}
        </h1>
      </ViewTransition>
    </div>
    <Badge
      variant="outline"
      className="activity-compact:hidden shrink-0 border-primary/40 px-2 text-primary sm:px-2.5"
    >
      {statusIcon}
      {statusLabel}
    </Badge>
  </header>
);
