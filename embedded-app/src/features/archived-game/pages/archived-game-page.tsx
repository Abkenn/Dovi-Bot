import { CircleSlash2, History, Skull, Swords, Trophy } from 'lucide-react';
import { ViewTransition } from 'react';
import { BossHistory } from '@/components/boss-history';
import { MobilePipStats } from '@/components/mobile-pip-stats';
import { GameSwitcher } from '@/features/game-stats/components/game-switcher';
import { StatsPageHeader } from '@/features/game-stats/components/stats-page-header';
import type { ArchivedGame } from '@/live-stats.types';
import { ArchivedGameTotalCard } from '../components/archived-game-total-card';

type ArchivedGamePageProps = {
  game: ArchivedGame;
  games: ArchivedGame[];
};

export const ArchivedGamePage = ({ game, games }: ArchivedGamePageProps) => (
  <main className="mobile-pip-frame activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden activity-compact:!space-y-2 activity-compact:!p-3 activity-compact:flex activity-compact:flex-col activity-compact:justify-center mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12">
    <MobilePipStats
      gameName={game.name}
      deaths={game.deaths}
      bossDeaths={game.bossDeaths}
      nonBossDeaths={game.nonBossDeaths}
      killedBossCount={game.killedBossCount}
    />
    <StatsPageHeader
      eyebrow="Dovi Archived Stats"
      title={game.name}
      statusIcon={<History aria-hidden="true" />}
      statusLabel="Complete history"
    />
    <div className="activity-compact:hidden mobile-pip-hide">
      <GameSwitcher games={games} selectedGameId={game.id} />
    </div>
    <ViewTransition name="stats-totals">
      <section
        className="activity-compact:gap-2 mobile-pip-hide grid grid-cols-2 gap-3"
        aria-label="Archived game totals"
      >
        <ArchivedGameTotalCard
          icon={<Skull aria-hidden="true" />}
          value={game.deaths}
          label="Total deaths"
          cacheKey={`${game.id}:deaths`}
          suffix={game.nonBossDeaths === null ? '+' : undefined}
        />
        <ArchivedGameTotalCard
          icon={<Swords aria-hidden="true" />}
          value={game.bossDeaths}
          label="Boss deaths"
          cacheKey={`${game.id}:boss-deaths`}
        />
        <ArchivedGameTotalCard
          icon={<CircleSlash2 aria-hidden="true" />}
          value={game.nonBossDeaths ?? 0}
          label="Non-boss deaths"
          cacheKey={`${game.id}:non-boss-deaths`}
          fallback={game.nonBossDeaths === null ? 'Not tracked' : undefined}
        />
        <ArchivedGameTotalCard
          icon={<Trophy aria-hidden="true" />}
          value={game.killedBossCount}
          label="Bosses killed"
          cacheKey={`${game.id}:bosses-killed`}
        />
      </section>
    </ViewTransition>
    <ViewTransition name="boss-journey">
      <div className="activity-compact:hidden mobile-pip-hide">
        <BossHistory bosses={game.bosses} cacheKey={game.id} />
      </div>
    </ViewTransition>
    <footer className="activity-compact:hidden mobile-pip-hide py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
      Archived game stats · Anonymous view
    </footer>
  </main>
);
