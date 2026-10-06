import { Link } from '@tanstack/react-router';
import { ChartNoAxesCombined, Music2, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArchivedGame } from '@/live-stats.types';
import { GamePicker } from './game-picker';

type GameSwitcherProps = {
  games: ArchivedGame[];
  selectedGameId: string | null;
};

export const GameSwitcher = ({ games, selectedGameId }: GameSwitcherProps) => {
  return (
    <nav
      aria-label="Game stats"
      className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:flex sm:w-fit"
    >
      <Link
        to="/"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'relative isolate overflow-hidden px-2.5',
          selectedGameId === null &&
            'border-primary/40 text-primary-foreground',
        )}
      >
        {selectedGameId === null ? (
          <motion.span
            layoutId="active-game-tab"
            className="absolute inset-0 -z-10 bg-primary"
          />
        ) : null}
        <motion.span
          className="flex items-center gap-1.5"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Radio className="size-3.5" aria-hidden="true" />
          Live
        </motion.span>
      </Link>
      <Link
        to="/stats"
        preload="intent"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'relative isolate overflow-hidden px-2.5',
          selectedGameId === 'stats' &&
            'border-primary/40 text-primary-foreground',
        )}
      >
        {selectedGameId === 'stats' ? (
          <motion.span
            layoutId="active-game-tab"
            className="absolute inset-0 -z-10 bg-primary"
          />
        ) : null}
        <motion.span
          className="flex items-center gap-1.5"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <ChartNoAxesCombined className="size-3.5" aria-hidden="true" />
          Stats
        </motion.span>
      </Link>
      <GamePicker
        key={selectedGameId}
        games={games}
        selectedGameId={selectedGameId}
      />
      <Link
        to="/music"
        search={{}}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'relative isolate overflow-hidden px-2.5',
          selectedGameId === 'music' &&
            'border-primary/40 text-primary-foreground',
        )}
      >
        {selectedGameId === 'music' ? (
          <motion.span
            layoutId="active-game-tab"
            className="absolute inset-0 -z-10 bg-primary"
          />
        ) : null}
        <motion.span
          className="flex items-center gap-1.5"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          <Music2 className="size-3.5" aria-hidden="true" />
          Music
        </motion.span>
      </Link>
    </nav>
  );
};
