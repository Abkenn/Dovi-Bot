import { BossAchievements } from '@/components/boss-achievements';
import type { BossAchievement, BossComparison } from '@/live-stats.types';

type BossHighlightProps = {
  label: string;
  boss: BossComparison | null;
  detail: string;
  achievements?: BossAchievement[];
};

export const BossHighlight = ({
  label,
  boss,
  detail,
  achievements = [],
}: BossHighlightProps) => (
  <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
    <p className="text-[0.6rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
      {label}
    </p>
    <div className="mt-0.5 flex flex-wrap items-center gap-2">
      <p className="font-semibold">{boss?.name ?? 'Timing unavailable'}</p>
      <BossAchievements achievements={achievements} />
    </div>
    <p className="text-xs text-muted-foreground">{boss ? detail : '-'}</p>
  </div>
);
