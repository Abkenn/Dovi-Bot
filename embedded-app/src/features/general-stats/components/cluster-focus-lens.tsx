import { motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { GameComparison } from '@/live-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';

type ClusterFocusLensProps = {
  games: GameComparison[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onGamePreview?: (game: GameComparison) => void;
  onGameSelect: (game: GameComparison) => void;
};

export const ClusterFocusLens = ({
  games,
  onMouseEnter,
  onMouseLeave,
  onGamePreview,
  onGameSelect,
}: ClusterFocusLensProps) => {
  const [previewedGame, setPreviewedGame] = useState(games[0]);
  const previewGame = (game: GameComparison) => {
    setPreviewedGame(game);
    onGamePreview?.(game);
  };

  if (!previewedGame) {
    return null;
  }

  return (
    <motion.div
      role="dialog"
      aria-label={`${games.length} nearby games`}
      initial={{ opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-72 rounded-xl border border-primary/35 bg-card/98 p-3 shadow-[0_16px_44px_oklch(0_0_0/0.42),0_0_24px_oklch(0.65_0.225_20/0.1)] backdrop-blur"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-primary uppercase">
            Cluster detail
          </p>
          <p className="text-xs text-muted-foreground">
            Hover a game. Click for boss details.
          </p>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {games.length} games
        </span>
      </div>

      <div className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[0.6875rem] before:w-px before:bg-primary/25">
        {games.map((game) => {
          const isPreviewed = previewedGame.id === game.id;

          return (
            <button
              key={game.id}
              type="button"
              aria-label={`${game.name}, ${game.averageAttemptsPerBoss} attempts`}
              onMouseEnter={() => previewGame(game)}
              onFocus={() => previewGame(game)}
              onClick={() => onGameSelect(game)}
              className={cn(
                'relative grid w-full grid-cols-[1.4rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-left transition-[background-color,border-color,transform,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isPreviewed
                  ? 'scale-[1.02] border-primary/40 bg-primary/12'
                  : 'border-transparent bg-background/25 opacity-65 hover:opacity-100',
              )}
            >
              <span
                className={cn(
                  'relative z-10 mx-auto size-2.5 rounded-full border-2 border-background bg-primary transition-transform',
                  isPreviewed && 'scale-125 shadow-[0_0_10px_var(--primary)]',
                )}
              />
              <span className="truncate text-xs font-semibold">
                {game.name}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {game.averageAttemptsPerBoss.toFixed(1)}×
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-background/45 p-2 text-xs">
        <div>
          <p className="text-muted-foreground">Pressure</p>
          <p className="font-semibold">
            {previewedGame.averageAttemptsPerBoss} attempts
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Winning attempt</p>
          <p className="font-semibold">
            {formatStatsDuration(
              previewedGame.averageWinningAttemptSeconds ?? 0,
            )}{' '}
            winning attempt
          </p>
        </div>
      </div>
    </motion.div>
  );
};
