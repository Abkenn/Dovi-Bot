import { CircleSlash2, Radio, Skull, Swords, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewTransition } from 'react';
import { BossHistory } from '@/components/boss-history';
import { CurrentBossCard } from '@/components/current-boss-card';
import { MobilePipStats } from '@/components/mobile-pip-stats';
import { StreamEncounters } from '@/components/stream-encounters';
import { GameSwitcher } from '@/features/game-stats/components/game-switcher';
import { StatsPageHeader } from '@/features/game-stats/components/stats-page-header';
import { cn } from '@/lib/utils';
import type { LiveStats } from '@/live-stats.types';
import { LiveStatsDesktopPip } from '../components/live-stats-desktop-pip';
import { LiveTotalCard } from '../components/live-total-card';

type LiveStatsPageProps = {
  stats: LiveStats;
};

export const LiveStatsPage = ({ stats }: LiveStatsPageProps) => {
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

  const hasDesktopPipBoss = Boolean(stats.currentBoss ?? stats.lastKilledBoss);

  return (
    <main
      className={cn(
        'mobile-pip-frame activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden activity-compact:!space-y-2 activity-compact:!p-3 activity-compact:flex activity-compact:flex-col activity-compact:justify-center mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12',
        hasDesktopPipBoss && 'desktop-pip-live-frame',
      )}
    >
      <MobilePipStats
        gameName={stats.game.name}
        deaths={stats.game.deaths}
        bossDeaths={stats.game.bossDeaths}
        nonBossDeaths={stats.game.nonBossDeaths}
        killedBossCount={stats.game.killedBossCount}
      />
      <LiveStatsDesktopPip
        game={stats.game}
        currentBoss={stats.currentBoss}
        lastKilledBoss={stats.lastKilledBoss}
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
          <LiveTotalCard
            icon={<Skull aria-hidden="true" />}
            value={stats.game.deaths}
            label="Total deaths"
            cacheKey={`${stats.game.id}:deaths`}
            suffix={stats.game.nonBossDeaths === null ? '+' : undefined}
          />
          <LiveTotalCard
            icon={<Swords aria-hidden="true" />}
            value={stats.game.bossDeaths}
            label="Boss deaths"
            cacheKey={`${stats.game.id}:boss-deaths`}
          />
          <LiveTotalCard
            icon={<CircleSlash2 aria-hidden="true" />}
            value={stats.game.nonBossDeaths ?? 0}
            label="Non-boss deaths"
            cacheKey={`${stats.game.id}:non-boss-deaths`}
            fallback={
              stats.game.nonBossDeaths === null ? 'Not tracked' : undefined
            }
          />
          <LiveTotalCard
            icon={<Trophy aria-hidden="true" />}
            value={stats.game.killedBossCount}
            label="Bosses killed"
            cacheKey={`${stats.game.id}:bosses-killed`}
          />
        </section>
      </ViewTransition>
      <ViewTransition name="live-details">
        <motion.div
          className="activity-compact:hidden mobile-pip-hide space-y-3 overflow-hidden sm:space-y-5"
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
          <BossHistory bosses={stats.bosses} cacheKey={stats.game.id} />
        </div>
      </ViewTransition>
      <footer className="activity-compact:hidden mobile-pip-hide py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
        Anonymous view · Refreshes every 5 seconds
      </footer>
    </main>
  );
};
