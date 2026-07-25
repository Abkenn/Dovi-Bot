import { Check } from 'lucide-react';
import type { LastKilledBoss } from '@/live-stats.types';

type DesktopPipLastBossStatsProps = {
  gameName: string;
  totalDeaths: number;
  killedBossCount: number;
  boss: LastKilledBoss;
};

export const DesktopPipLastBossStats = ({
  gameName,
  totalDeaths,
  killedBossCount,
  boss,
}: DesktopPipLastBossStatsProps) => (
  <section className="desktop-pip-live-only w-full rounded-xl border border-primary/25 bg-card px-3 py-2.5 shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <p className="truncate text-sm leading-none font-bold">{gameName}</p>
      <p className="shrink-0 text-[0.58rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {totalDeaths} deaths · {killedBossCount} bosses
      </p>
    </div>
    <div className="flex items-start justify-between gap-2 pt-2">
      <div className="min-w-0">
        <p className="text-[0.55rem] leading-none font-bold tracking-[0.16em] text-primary uppercase">
          Last boss
        </p>
        <h2 className="mt-1 truncate text-lg leading-none font-bold">
          {boss.name}
        </h2>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/40 px-1.5 py-0.5 text-[0.58rem] font-semibold text-emerald-400">
        <Check className="size-3" aria-hidden="true" />
        Killed
      </span>
    </div>
    <div className="mt-2.5">
      <strong className="block truncate text-xl leading-none font-bold tabular-nums">
        {boss.deaths}
      </strong>
      <span className="mt-1 block text-[0.5rem] leading-none font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        Deaths
      </span>
    </div>
  </section>
);
