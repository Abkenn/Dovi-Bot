import { Radio, Skull, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewTransition } from 'react';
import { BossHistory } from '@/components/boss-history';
import { CurrentBossCard } from '@/components/current-boss-card';
import { GameSwitcher } from '@/components/game-switcher';
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
  <Card className="activity-compact:rounded-lg gap-0 py-0">
    <CardContent className="activity-compact:p-2 flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="activity-compact:hidden grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="activity-compact:text-xl block text-2xl font-bold tracking-tight sm:text-4xl">
          {value}
        </strong>
        <span className="activity-compact:text-[0.55rem] text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs sm:tracking-[0.12em]">
          {label}
        </span>
      </div>
    </CardContent>
  </Card>
);

export const LiveStatsPage = ({ stats }: { stats: LiveStats }) => {
  if (!stats.game) {
    return (
      <main className="activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden mx-auto min-h-svh w-full max-w-5xl space-y-6 px-3 py-3 sm:px-8 sm:py-12">
        <div className="activity-compact:hidden">
          <GameSwitcher games={stats.games} selectedGameId={null} />
        </div>
        <div className="grid min-h-[70svh] place-content-center px-6 text-center">
          <div className="mx-auto max-w-lg space-y-4">
            <Skull
              className="mx-auto size-12 text-primary"
              aria-hidden="true"
            />
            <p className="text-xs font-bold tracking-[0.24em] text-primary uppercase">
              Dovi
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              No tracked game yet
            </h1>
            <p className="text-muted-foreground">
              Start a boss tracking session in staging to light up this
              dashboard.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden activity-compact:space-y-2 activity-compact:p-3 mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12"
    >
      <header className="flex items-start justify-between gap-2 sm:gap-5 sm:pb-3">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          <p className="activity-compact:hidden text-[0.65rem] font-bold tracking-[0.2em] text-primary uppercase sm:text-xs sm:tracking-[0.24em]">
            Dovi Live Stats
          </p>
          <ViewTransition name="game-title">
            <h1 className="activity-compact:text-xl text-2xl leading-none font-bold tracking-tight sm:text-6xl">
              {stats.game.name}
            </h1>
          </ViewTransition>
        </div>
        <Badge
          variant="outline"
          className="activity-compact:hidden shrink-0 border-primary/40 px-2 text-primary sm:px-2.5"
        >
          <Radio aria-hidden="true" />
          <span className="hidden min-[420px]:inline">Live tracking</span>
          <span className="min-[420px]:hidden">Live</span>
        </Badge>
      </header>
      <div className="activity-compact:hidden">
        <GameSwitcher games={stats.games} selectedGameId={null} />
      </div>
      <motion.section
        className="activity-compact:gap-2 grid grid-cols-2 gap-3"
        aria-label="Game totals"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
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
      </motion.section>
      <div className="activity-compact:hidden">
        <CurrentBossCard boss={stats.currentBoss} />
      </div>
      <div className="activity-compact:hidden">
        <StreamEncounters
          encounters={stats.streamEncounters}
          currentStreamWindow={stats.currentStreamWindow}
        />
      </div>
      <div className="activity-compact:hidden">
        <BossHistory bosses={stats.killedBosses} />
      </div>
      <footer className="activity-compact:hidden py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
        Anonymous view · Refreshes every 5 seconds
      </footer>
    </motion.main>
  );
};
