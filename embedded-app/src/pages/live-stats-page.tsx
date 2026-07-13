import { Radio, Skull, Trophy } from 'lucide-react';
import { BossHistory } from '@/components/boss-history';
import { CurrentBossCard } from '@/components/current-boss-card';
import { StreamEncounters } from '@/components/stream-encounters';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { LiveStats } from '@/live-stats.types';

const TotalCard = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <Card className="gap-0 py-0">
    <CardContent className="flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="block text-2xl font-bold tracking-tight sm:text-4xl">
          {value}
        </strong>
        <span className="text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs sm:tracking-[0.12em]">
          {label}
        </span>
      </div>
    </CardContent>
  </Card>
);

export const LiveStatsPage = ({ stats }: { stats: LiveStats }) => {
  if (!stats.game) {
    return (
      <main className="grid min-h-svh place-content-center px-6 text-center">
        <div className="mx-auto max-w-lg space-y-4">
          <Skull className="mx-auto size-12 text-primary" aria-hidden="true" />
          <p className="text-xs font-bold tracking-[0.24em] text-primary uppercase">
            Dovi
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            No tracked game yet
          </h1>
          <p className="text-muted-foreground">
            Start a boss tracking session in staging to light up this dashboard.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12">
      <header className="flex items-start justify-between gap-2 sm:gap-5 sm:pb-3">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          <p className="text-[0.65rem] font-bold tracking-[0.2em] text-primary uppercase sm:text-xs sm:tracking-[0.24em]">
            Dovi Live Stats
          </p>
          <h1 className="text-2xl leading-none font-bold tracking-tight sm:text-6xl">
            {stats.game.name}
          </h1>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-primary/40 px-2 text-primary sm:px-2.5"
        >
          <Radio aria-hidden="true" />
          <span className="hidden min-[420px]:inline">Live tracking</span>
          <span className="min-[420px]:hidden">Live</span>
        </Badge>
      </header>
      <section className="grid grid-cols-2 gap-3" aria-label="Game totals">
        <TotalCard
          icon={<Skull aria-hidden="true" />}
          value={stats.game.deaths}
          label="Total deaths"
        />
        <TotalCard
          icon={<Trophy aria-hidden="true" />}
          value={stats.game.killedBossCount}
          label="Bosses killed"
        />
      </section>
      <CurrentBossCard boss={stats.currentBoss} />
      <StreamEncounters encounters={stats.streamEncounters} />
      <BossHistory bosses={stats.killedBosses} />
      <footer className="py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
        Anonymous view · Refreshes every 5 seconds
      </footer>
    </main>
  );
};
