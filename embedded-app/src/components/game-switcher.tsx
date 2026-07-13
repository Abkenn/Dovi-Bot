import { Link } from '@tanstack/react-router';
import { Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArchivedGame } from '@/live-stats.types';

export const GameSwitcher = ({
  games,
  selectedGameId,
}: {
  games: ArchivedGame[];
  selectedGameId: string | null;
}) => (
  <nav
    aria-label="Game stats"
    className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0"
  >
    <div className="flex min-w-max gap-2 pb-1">
      <Link
        to="/"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'relative isolate overflow-hidden',
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
      {games.map((game) => (
        <Link
          key={game.id}
          to="/games/$gameId"
          params={{ gameId: game.id }}
          preload="intent"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'relative isolate overflow-hidden',
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
