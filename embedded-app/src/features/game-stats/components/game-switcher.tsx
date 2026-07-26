import { Link } from '@tanstack/react-router';
import { ChartNoAxesCombined, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArchivedGame } from '@/live-stats.types';
import { useDragScroll } from '../hooks/use-drag-scroll';

type GameSwitcherProps = {
  games: ArchivedGame[];
  selectedGameId: string | null;
};

export const GameSwitcher = ({ games, selectedGameId }: GameSwitcherProps) => {
  const dragScroll = useDragScroll();

  return (
    <nav
      aria-label="Game stats"
      className="game-switcher-scroll -mx-3 cursor-grab touch-pan-y overflow-x-auto px-3 select-none active:cursor-grabbing sm:mx-0 sm:px-0"
      {...dragScroll}
    >
      <div className="flex min-w-max gap-1.5">
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
        {games.map((game) => (
          <Link
            key={game.id}
            to="/games/$gameId"
            params={{ gameId: game.id }}
            preload="intent"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'relative isolate overflow-hidden px-2.5',
              selectedGameId === game.id &&
                'border-primary/40 text-primary-foreground',
            )}
          >
            {selectedGameId === game.id ? (
              <motion.span
                layoutId="active-game-tab"
                className="absolute inset-0 -z-10 bg-primary"
              />
            ) : null}
            <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
              {game.name}
            </motion.span>
          </Link>
        ))}
      </div>
    </nav>
  );
};
