import { ArrowLeft, Skull, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewTransition } from 'react';
import { BossHistory } from '@/components/boss-history';
import { GameSwitcher } from '@/components/game-switcher';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ArchivedGame } from '@/live-stats.types';

const ArchiveTotal = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <Card className="gap-0 py-0">
    <CardContent className="flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div>
        <strong className="block text-2xl font-bold tracking-tight sm:text-4xl">
          {value}
        </strong>
        <span className="text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs">
          {label}
        </span>
      </div>
    </CardContent>
  </Card>
);

export const ArchivedGamePage = ({
  game,
  games,
}: {
  game: ArchivedGame;
  games: ArchivedGame[];
}) => (
  <motion.main
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12"
  >
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1 sm:space-y-2">
        <p className="flex items-center gap-1 text-[0.65rem] font-bold tracking-[0.2em] text-primary uppercase sm:text-xs">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Archived stats
        </p>
        <ViewTransition name="game-title">
          <h1 className="text-2xl leading-none font-bold tracking-tight sm:text-6xl">
            {game.name}
          </h1>
        </ViewTransition>
      </div>
      <Badge variant="secondary">Complete history</Badge>
    </header>
    <GameSwitcher games={games} selectedGameId={game.id} />
    <motion.section
      className="grid grid-cols-2 gap-3"
      aria-label="Archived game totals"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <ArchiveTotal
        icon={<Skull aria-hidden="true" />}
        value={game.deaths}
        label="Total deaths"
      />
      <ArchiveTotal
        icon={<Trophy aria-hidden="true" />}
        value={game.killedBossCount}
        label="Bosses killed"
      />
    </motion.section>
    <BossHistory bosses={game.killedBosses} />
    <footer className="py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
      Archived game stats · Anonymous view
    </footer>
  </motion.main>
);
