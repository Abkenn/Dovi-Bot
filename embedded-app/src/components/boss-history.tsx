import { Check, Skull } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { KilledBoss } from '@/live-stats.types';

export const BossHistory = ({ bosses }: { bosses: KilledBoss[] }) => (
  <Card className="gap-3 py-4 sm:gap-6 sm:py-6">
    <CardHeader className="grid-cols-[1fr_auto] px-4 sm:px-6">
      <div className="space-y-1 sm:space-y-2">
        <CardDescription className="font-semibold tracking-[0.18em] text-primary uppercase">
          Journey
        </CardDescription>
        <CardTitle>
          <h2 className="text-xl sm:text-2xl">Killed bosses</h2>
        </CardTitle>
      </div>
      <Badge variant="secondary" className="size-9 rounded-full p-0 text-sm">
        {bosses.length}
      </Badge>
    </CardHeader>
    <CardContent className="px-4 sm:px-6">
      {bosses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
          <Skull className="size-8 opacity-60" aria-hidden="true" />
          <p>No defeated bosses recorded for this game yet.</p>
        </div>
      ) : (
        <motion.ol
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.025 } },
          }}
        >
          {bosses.map((boss, index) => (
            <motion.li
              key={boss.name}
              layout="position"
              variants={{
                hidden: { opacity: 0, x: -8 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              {index > 0 ? <Separator /> : null}
              <div className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 py-3 sm:grid-cols-[2rem_1fr_auto] sm:gap-3 sm:py-4">
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
            </motion.li>
          ))}
        </motion.ol>
      )}
    </CardContent>
  </Card>
);
