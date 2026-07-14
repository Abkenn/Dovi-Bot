type MobilePipStatsProps = {
  gameName: string;
  deaths: number;
  killedBossCount: number;
};

const MobilePipTotal = ({ value, label }: { value: number; label: string }) => {
  const valueSize = Math.abs(value) >= 100 ? 'text-xl' : 'text-2xl';

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/70 px-2 py-3 text-center">
      <strong
        className={`${valueSize} block leading-none font-bold tabular-nums`}
      >
        {value}
      </strong>
      <span className="mt-1.5 block text-[0.5rem] leading-tight font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
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
      <MobilePipTotal value={deaths} label="Deaths" />
      <MobilePipTotal value={killedBossCount} label="Bosses killed" />
    </div>
  </div>
);
