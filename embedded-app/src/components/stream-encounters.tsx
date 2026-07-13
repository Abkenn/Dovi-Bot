import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { LiveStats, StreamEncounter } from '@/live-stats.types';

const OUTCOME_LABELS: Record<StreamEncounter['outcome'], string> = {
  ACTIVE: 'Fighting',
  PAUSED: 'Paused',
  KILLED: 'Killed',
  LEFT: 'Moved on',
};

export const StreamEncounters = ({
  encounters,
  currentStreamWindow,
}: {
  encounters: StreamEncounter[];
  currentStreamWindow: LiveStats['currentStreamWindow'];
}) => {
  const now = Date.now();
  const isCurrentStream =
    currentStreamWindow !== null &&
    now >= Date.parse(currentStreamWindow.startAt) &&
    now <= Date.parse(currentStreamWindow.endAt);

  return (
    <Card className="gap-3 py-4 sm:gap-6 sm:py-6">
      <CardHeader className="grid-cols-[1fr_auto] px-4 sm:px-6">
        <div className="space-y-1 sm:space-y-2">
          <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
            {isCurrentStream ? 'This stream' : 'Last stream'}
          </CardDescription>
          <CardTitle>
            <h2 className="text-xl sm:text-2xl">Bosses faced</h2>
          </CardTitle>
        </div>
        <Badge variant="secondary" className="size-9 rounded-full p-0 text-sm">
          {encounters.length}
        </Badge>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ol>
          {encounters.map((encounter, index) => (
            <li key={encounter.name}>
              {index > 0 ? <Separator /> : null}
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{encounter.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {encounter.deaths} deaths
                  </p>
                </div>
                <Badge
                  variant={
                    encounter.outcome === 'ACTIVE' ? 'default' : 'outline'
                  }
                >
                  {OUTCOME_LABELS[encounter.outcome]}
                </Badge>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
