import { Pause, Radio } from 'lucide-react';
import { useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import type { CurrentBoss } from '@/live-stats.types';

type DesktopPipLiveStatsProps = {
  gameName: string;
  totalDeaths: number;
  killedBossCount: number;
  boss: NonNullable<CurrentBoss>;
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) {
    return '--:--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const AttemptStat = ({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) => (
  <div className="min-w-0">
    <strong className="block truncate text-xl leading-none font-bold tabular-nums">
      {value}
    </strong>
    <span className="mt-1 block text-[0.5rem] leading-none font-semibold tracking-[0.1em] text-muted-foreground uppercase">
      {label}
    </span>
  </div>
);

export const DesktopPipLiveStats = ({
  gameName,
  totalDeaths,
  killedBossCount,
  boss,
}: DesktopPipLiveStatsProps) => {
  const paused = boss.status === 'PAUSED';
  const elapsed = useElapsedSeconds(boss.attemptStartedAt, paused);

  return (
    <section className="desktop-pip-live-only w-full rounded-xl border border-primary/25 bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <p className="truncate text-sm leading-none font-bold">{gameName}</p>
        <p className="shrink-0 text-[0.58rem] font-semibold tracking-wide text-muted-foreground uppercase">
          {totalDeaths} deaths · {killedBossCount} bosses
        </p>
      </div>
      <div className="flex items-start justify-between gap-2 pt-2">
        <div className="min-w-0">
          <p className="text-[0.55rem] leading-none font-bold tracking-[0.16em] text-primary uppercase">
            Current boss
          </p>
          <h2 className="mt-1 truncate text-lg leading-none font-bold">
            {boss.name}
          </h2>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.58rem] font-semibold ${
            paused
              ? 'border-amber-500/40 text-amber-300'
              : 'border-primary/40 text-primary'
          }`}
        >
          {paused ? (
            <Pause className="size-3" aria-hidden="true" />
          ) : (
            <Radio className="size-3" aria-hidden="true" />
          )}
          {paused ? 'Paused' : 'Live'}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <AttemptStat value={boss.deaths} label="Deaths" />
        <AttemptStat value={boss.attemptNumber ?? '–'} label="Attempt" />
        <AttemptStat value={formatDuration(elapsed)} label="Attempt time" />
      </div>
    </section>
  );
};
