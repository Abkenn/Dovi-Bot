import { Check, Skull } from 'lucide-react';
import type { KilledBoss } from '@/api.types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const BossHistory = ({ bosses }: { bosses: KilledBoss[] }) => (
  <Card>
    <CardHeader className="grid-cols-[1fr_auto]">
      <div className="space-y-2">
        <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
          Journey
        </CardDescription>
        <CardTitle>
          <h2 className="text-2xl">Killed bosses</h2>
        </CardTitle>
      </div>
      <Badge variant="secondary" className="size-9 rounded-full p-0 text-sm">
        {bosses.length}
      </Badge>
    </CardHeader>
    <CardContent>
      {bosses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <Skull className="size-8 opacity-60" aria-hidden="true" />
          <p>No defeated bosses recorded for this game yet.</p>
        </div>
      ) : (
        <ol>
          {bosses.map((boss, index) => (
            <li key={`${boss.name}-${boss.killedAt}`}>
              {index > 0 ? <Separator /> : null}
              <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4">
                <span className="text-muted-foreground text-sm tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-semibold">{boss.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {boss.deaths} deaths
                  </p>
                </div>
                <span
                  className="grid size-7 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"
                  role="img"
                  aria-label="Killed"
                >
                  <Check className="size-4" aria-hidden="true" />
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </CardContent>
  </Card>
);
