import { Link } from '@tanstack/react-router';
import { ArrowLeft, Skull, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewTransition } from 'react';
import { BossHistory } from '@/components/boss-history';
import { GameSwitcher } from '@/components/game-switcher';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
  <Card className="activity-compact:rounded-lg gap-0 py-0">
    <CardContent className="activity-compact:!p-2 flex items-center gap-2.5 p-3 sm:gap-4 sm:p-7">
      <span className="activity-compact:hidden grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="activity-compact:!text-xl block text-2xl font-bold tracking-tight sm:text-4xl">
          {value}
        </strong>
        <span className="activity-compact:!text-[0.55rem] text-muted-foreground text-[0.6rem] leading-tight font-semibold tracking-[0.08em] uppercase sm:text-xs">
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
    className="activity-compact:h-svh activity-compact:min-h-0 activity-compact:overflow-hidden activity-compact:!space-y-2 activity-compact:!p-3 activity-compact:flex activity-compact:flex-col activity-compact:justify-center mx-auto min-h-svh w-full max-w-5xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-8 sm:py-12"
  >
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1 sm:space-y-2">
        <Link
          to="/"
          className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} activity-compact:hidden -ml-2 text-primary uppercase`}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Archived stats
        </Link>
        <ViewTransition name="game-title">
          <h1 className="activity-compact:!text-xl text-2xl leading-none font-bold tracking-tight sm:text-6xl">
            {game.name}
          </h1>
        </ViewTransition>
      </div>
      <Badge className="activity-compact:hidden" variant="secondary">
        Complete history
      </Badge>
    </header>
    <div className="activity-compact:hidden">
      <GameSwitcher games={games} selectedGameId={game.id} />
    </div>
    <motion.section
      className="activity-compact:gap-2 grid grid-cols-2 gap-3"
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
    <div className="activity-compact:hidden">
      <BossHistory bosses={game.killedBosses} />
    </div>
    <footer className="activity-compact:hidden py-2 text-center text-[0.65rem] text-muted-foreground sm:py-3 sm:text-xs">
      Archived game stats · Anonymous view
    </footer>
  </motion.main>
);
