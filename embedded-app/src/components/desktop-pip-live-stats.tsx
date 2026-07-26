import { Pause, Radio } from 'lucide-react';
import {
  CURRENT_ATTEMPT_STATE_LABEL,
  getCurrentAttemptDisplay,
} from '@/components/current-attempt-display';
import { DesktopPipAttemptStat } from '@/components/desktop-pip-attempt-stat';
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

export const DesktopPipLiveStats = ({
  gameName,
  totalDeaths,
  killedBossCount,
  boss,
}: DesktopPipLiveStatsProps) => {
  const paused = boss.status === 'PAUSED';
  const elapsed = useElapsedSeconds(
    boss.attemptStartedAt,
    paused ? boss.pausedAt : null,
  );
  const attemptDisplay = getCurrentAttemptDisplay(boss, elapsed);
  const isIdle = attemptDisplay.state !== 'LIVE';

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
            isIdle
              ? 'border-amber-500/40 text-amber-300'
              : 'border-primary/40 text-primary'
          }`}
        >
          {isIdle ? (
            <Pause className="size-3" aria-hidden="true" />
          ) : (
            <Radio className="size-3" aria-hidden="true" />
          )}
          {CURRENT_ATTEMPT_STATE_LABEL[attemptDisplay.state]}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <DesktopPipAttemptStat value={boss.deaths} label="Deaths" />
        <DesktopPipAttemptStat
          value={boss.attemptNumber ?? '–'}
          label="Attempt"
        />
        <DesktopPipAttemptStat
          value={formatDuration(attemptDisplay.elapsedSeconds)}
          label="Attempt time"
        />
      </div>
    </section>
  );
};
