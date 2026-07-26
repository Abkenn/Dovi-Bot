import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { GameComparison } from '@/live-stats.types';

type GeneralStatsHighlightCardProps = {
  icon: ReactNode;
  label: string;
  game: GameComparison | null;
  detail: string;
};

export const GeneralStatsHighlightCard = ({
  icon,
  label,
  game,
  detail,
}: GeneralStatsHighlightCardProps) => (
  <Card className="gap-0 py-0">
    <CardContent className="flex items-center gap-3 p-4 sm:p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-lg font-bold">
          {game?.name ?? 'Not enough data'}
        </p>
        <p className="text-xs text-muted-foreground">{game ? detail : '-'}</p>
      </div>
    </CardContent>
  </Card>
);
