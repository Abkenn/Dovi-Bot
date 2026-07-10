import { Pause, Radio } from 'lucide-react';
import type { CurrentBoss } from '@/api.types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useElapsedSeconds } from '@/hooks/use-elapsed-seconds';

const formatDuration = (seconds: number | null) => {
  if (seconds === null) {
    return '--:--';
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const Stat = ({ value, label }: { value: string | number; label: string }) => (
  <div className="space-y-1">
    <strong className="block text-3xl font-bold tracking-tight sm:text-4xl">
      {value}
    </strong>
    <span className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.14em] uppercase">
      {label}
    </span>
  </div>
);

export const CurrentBossCard = ({ boss }: { boss: CurrentBoss | null }) => {
  const paused = boss?.status === 'PAUSED';
  const elapsed = useElapsedSeconds(boss?.attemptStartedAt ?? null, paused);

  if (!boss) {
    return (
      <Card className="border-dashed bg-card/70">
        <CardHeader>
          <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
            Current boss
          </CardDescription>
          <CardTitle>
            <h2 className="text-2xl">Waiting for tracking</h2>
          </CardTitle>
          <CardDescription>
            Live details will appear when the next boss begins.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={paused ? 'border-amber-500/40' : 'border-primary/20'}>
      <CardHeader className="grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
            Current boss
          </CardDescription>
          <CardTitle>
            <h2 className="text-2xl sm:text-3xl">{boss.name}</h2>
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className={
            paused
              ? 'border-amber-500/40 text-amber-300'
              : 'border-primary/40 text-primary'
          }
        >
          {paused ? <Pause aria-hidden="true" /> : <Radio aria-hidden="true" />}
          {paused ? 'Paused' : 'Live'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat value={boss.deaths} label="Deaths" />
          <Stat value={boss.attemptNumber ?? '–'} label="Attempt" />
          <Stat value={formatDuration(elapsed)} label="Attempt time" />
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
