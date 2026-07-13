type MobilePipStatsProps = {
  gameName: string;
  deaths: number;
  killedBossCount: number;
};

export const MobilePipStats = ({
  gameName,
  deaths,
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
      <div className="min-w-0 rounded-lg border border-border bg-card/70 px-2 py-3 text-center">
        <strong className="block text-2xl leading-none font-bold tabular-nums">
          {deaths}
        </strong>
        <span className="mt-1.5 block text-[0.5rem] leading-tight font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Deaths
        </span>
      </div>
      <div className="min-w-0 rounded-lg border border-border bg-card/70 px-2 py-3 text-center">
        <strong className="block text-2xl leading-none font-bold tabular-nums">
          {killedBossCount}
        </strong>
        <span className="mt-1.5 block text-[0.5rem] leading-tight font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Bosses killed
        </span>
      </div>
    </div>
  </div>
);
