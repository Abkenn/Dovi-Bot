import type { BossComparison } from '@/live-stats.types';

type BossHighlightProps = {
  label: string;
  boss: BossComparison | null;
  detail: string;
};

export const BossHighlight = ({ label, boss, detail }: BossHighlightProps) => (
  <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
    <p className="text-[0.6rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
      {label}
    </p>
    <p className="mt-0.5 font-semibold">{boss?.name ?? 'Timing unavailable'}</p>
    <p className="text-xs text-muted-foreground">{boss ? detail : '-'}</p>
  </div>
);
