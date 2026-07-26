import { DesktopPipLastBossStats } from '@/components/desktop-pip-last-boss-stats';
import { DesktopPipLiveStats } from '@/components/desktop-pip-live-stats';
import type { LiveStats } from '@/live-stats.types';

type LiveStatsDesktopPipProps = {
  game: NonNullable<LiveStats['game']>;
  currentBoss: LiveStats['currentBoss'];
  lastKilledBoss: LiveStats['lastKilledBoss'];
};

export const LiveStatsDesktopPip = ({
  game,
  currentBoss,
  lastKilledBoss,
}: LiveStatsDesktopPipProps) => {
  if (currentBoss) {
    return (
      <DesktopPipLiveStats
        gameName={game.name}
        totalDeaths={game.deaths}
        killedBossCount={game.killedBossCount}
        boss={currentBoss}
      />
    );
  }

  if (!lastKilledBoss) {
    return null;
  }

  return (
    <DesktopPipLastBossStats
      gameName={game.name}
      totalDeaths={game.deaths}
      killedBossCount={game.killedBossCount}
      boss={lastKilledBoss}
    />
  );
};
