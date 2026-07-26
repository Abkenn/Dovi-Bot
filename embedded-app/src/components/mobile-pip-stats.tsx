import { MobilePipTotal } from './mobile-pip-total';

type MobilePipStatsProps = {
  gameName: string;
  deaths: number;
  bossDeaths: number;
  nonBossDeaths: number | null;
  killedBossCount: number;
};

export const MobilePipStats = ({
  gameName,
  deaths,
  bossDeaths,
  nonBossDeaths,
  killedBossCount,
}: MobilePipStatsProps) => (
  <div
    className="mobile-pip-only min-h-0 flex-1 flex-col justify-center gap-3 overflow-hidden"
    aria-hidden="true"
  >
    <h2 className="truncate text-center text-base leading-tight font-bold">
      {gameName}
    </h2>
    <div className="grid grid-cols-2 gap-2">
      <MobilePipTotal
        value={deaths}
        label="Total deaths"
        cacheKey={`${gameName}:deaths`}
        suffix={nonBossDeaths === null ? '+' : undefined}
      />
      <MobilePipTotal
        value={bossDeaths}
        label="Boss deaths"
        cacheKey={`${gameName}:boss-deaths`}
      />
      <MobilePipTotal
        value={nonBossDeaths ?? 0}
        label="Non-boss deaths"
        cacheKey={`${gameName}:non-boss-deaths`}
        fallback={nonBossDeaths === null ? 'Not tracked' : undefined}
      />
      <MobilePipTotal
        value={killedBossCount}
        label="Bosses killed"
        cacheKey={`${gameName}:bosses-killed`}
      />
    </div>
  </div>
);
