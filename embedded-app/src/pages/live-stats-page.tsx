import { Radio, Skull, Trophy } from 'lucide-react';
import type { LiveStats } from '@/api.types';
import { BossHistory } from '@/components/boss-history';
import { CurrentBossCard } from '@/components/current-boss-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
    <CardContent className="flex items-center gap-4 p-5 sm:p-7">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <strong className="block text-3xl font-bold tracking-tight sm:text-4xl">
          {value}
        </strong>
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
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
    <main className="mx-auto min-h-svh w-full max-w-5xl space-y-5 px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex items-start justify-between gap-5 pb-3">
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-[0.24em] text-primary uppercase">
            Dovi Live Stats
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {stats.game.name}
          </h1>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          <Radio aria-hidden="true" /> Live tracking
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
      <BossHistory bosses={stats.killedBosses} />
      <footer className="py-3 text-center text-xs text-muted-foreground">
        Anonymous view · Refreshes every 5 seconds
      </footer>
    </main>
  );
};
