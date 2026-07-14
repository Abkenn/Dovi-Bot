import { Radio, Skull, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewTransition } from 'react';
import { AnimatedNumber } from '@/components/animated-number';
import { BossHistory } from '@/components/boss-history';
import { CurrentBossCard } from '@/components/current-boss-card';
import { GameSwitcher } from '@/components/game-switcher';
import { MobilePipStats } from '@/components/mobile-pip-stats';
import { StatsPageHeader } from '@/components/stats-page-header';
import { StreamEncounters } from '@/components/stream-encounters';
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
    <CardContent className="activity-compact:!p-2 flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="activity-compact:hidden grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div className="min-w-0">
        <AnimatedNumber
          value={value}
          className="activity-compact:!text-xl block text-2xl font-bold tracking-tight tabular-nums sm:text-4xl"
        />
        <span className="activity-compact:!text-[0.55rem] text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs sm:tracking-[0.12em]">
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
    <main className="mobile-pip-frame activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden activity-compact:!space-y-2 activity-compact:!p-3 activity-compact:flex activity-compact:flex-col activity-compact:justify-center mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12">
      <MobilePipStats
        gameName={stats.game.name}
        deaths={stats.game.deaths}
        killedBossCount={stats.game.killedBossCount}
      />
      <StatsPageHeader
        eyebrow="Dovi Live Stats"
        title={stats.game.name}
        statusIcon={<Radio aria-hidden="true" />}
        statusLabel="Live tracking"
      />
      <div className="activity-compact:hidden mobile-pip-hide">
        <GameSwitcher games={stats.games} selectedGameId={null} />
      </div>
      <ViewTransition name="stats-totals">
        <section
          className="activity-compact:gap-2 mobile-pip-hide grid grid-cols-2 gap-3"
          aria-label="Game totals"
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
        </section>
      </ViewTransition>
      <ViewTransition name="live-details">
        <motion.div
          className="activity-compact:hidden mobile-pip-hide space-y-3 sm:space-y-5"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <CurrentBossCard boss={stats.currentBoss} />
          <StreamEncounters
            encounters={stats.streamEncounters}
            currentStreamWindow={stats.currentStreamWindow}
          />
        </motion.div>
      </ViewTransition>
      <ViewTransition name="boss-journey">
        <div className="activity-compact:hidden mobile-pip-hide">
          <BossHistory bosses={stats.killedBosses} />
        </div>
      </ViewTransition>
      <footer className="activity-compact:hidden mobile-pip-hide py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
        Anonymous view · Refreshes every 5 seconds
      </footer>
    </main>
  );
};
