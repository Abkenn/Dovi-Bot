import { Pause, Radio } from 'lucide-react';
import {
  CURRENT_ATTEMPT_STATE_LABEL,
  getCurrentAttemptDisplay,
} from '@/components/current-attempt-display';
import { CurrentBossStat } from '@/components/current-boss-stat';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useElapsedSeconds } from '@/hooks/use-elapsed-seconds';
import type { CurrentBoss } from '@/live-stats.types';

const formatDuration = (seconds: number | null) => {
  if (seconds === null) {
    return '--:--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
};

type CurrentBossCardProps = {
  boss: CurrentBoss | null;
};

export const CurrentBossCard = ({ boss }: CurrentBossCardProps) => {
  const paused = boss?.status === 'PAUSED';
  const elapsed = useElapsedSeconds(
    boss?.attemptStartedAt ?? null,
    paused ? (boss.pausedAt ?? null) : null,
  );

  if (!boss) {
    return (
      <Card className="gap-3 border-dashed bg-card/70 py-4 sm:gap-6 sm:py-6">
        <CardHeader className="px-4 sm:px-6">
          <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
            Current boss
          </CardDescription>
          <CardTitle>
            <h2 className="text-xl sm:text-2xl">Waiting for tracking</h2>
          </CardTitle>
          <CardDescription>
            Live details will appear when the next boss begins.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const attemptDisplay = getCurrentAttemptDisplay(boss, elapsed);
  const isIdle = attemptDisplay.state !== 'LIVE';

  return (
    <Card
      className={`gap-4 py-4 sm:gap-6 sm:py-6 ${
        isIdle ? 'border-amber-500/40' : 'border-primary/20'
      }`}
    >
      <CardHeader className="grid-cols-[1fr_auto] px-4 sm:px-6">
        <div className="space-y-2">
          <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
            Current boss
          </CardDescription>
          <CardTitle>
            <h2 className="text-xl sm:text-3xl">{boss.name}</h2>
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className={
            isIdle
              ? 'border-amber-500/40 text-amber-300'
              : 'border-primary/40 text-primary'
          }
        >
          {isIdle ? <Pause aria-hidden="true" /> : <Radio aria-hidden="true" />}
          {CURRENT_ATTEMPT_STATE_LABEL[attemptDisplay.state]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:space-y-6 sm:px-6">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <CurrentBossStat value={boss.deaths} label="Deaths" />
          <CurrentBossStat value={boss.attemptNumber ?? '–'} label="Attempt" />
          <CurrentBossStat
            value={formatDuration(attemptDisplay.elapsedSeconds)}
            label="Attempt time"
          />
        </div>
        {paused && boss.pauseReason ? (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {boss.pauseReason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
