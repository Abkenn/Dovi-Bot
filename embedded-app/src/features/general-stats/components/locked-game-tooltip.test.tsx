import { render, screen, waitFor } from '@testing-library/react';
import { AnimatePresence } from 'motion/react';
import { describe, expect, it } from 'vitest';
import type { GameComparison } from '@/live-stats.types';
import { LockedGameTooltip } from './locked-game-tooltip';

const game: GameComparison = {
  id: 'test',
  name: 'Selected game',
  defeatedBossCount: 1,
  averageDeathsPerBoss: 2,
  averageAttemptsPerBoss: 3,
  averageWinningAttemptSeconds: 60,
  difficultyScore: 1,
  bossHighlights: {
    mostAttempts: { name: 'Boss', attempts: 3, winningAttemptSeconds: 60 },
    longestWinningAttempt: null,
    toughestOverall: null,
  },
};
const winners = {
  MOST_DEATHS: null,
  LONGEST_WINNING_ATTEMPT: null,
  TOUGHEST_OVERALL: null,
};

describe('locked game tooltip animation', () => {
  it('holds its position while closing, disables stale controls, and finishes its exit', async () => {
    const { rerender, container } = render(
      <AnimatePresence>
        <LockedGameTooltip
          key={game.id}
          game={game}
          winners={winners}
          position={{ x: 120, y: 80 }}
        />
      </AnimatePresence>,
    );
    const popup = container.querySelector('.locked-chart-popup');
    expect(popup).toHaveStyle({ left: '120px', top: '80px' });
    rerender(<AnimatePresence>{null}</AnimatePresence>);
    expect(popup).toBeInTheDocument();
    expect(popup).toHaveAttribute('aria-hidden', 'true');
    expect(popup).toHaveClass('pointer-events-none');
    expect(popup).toHaveStyle({ left: '120px', top: '80px' });
    await waitFor(() =>
      expect(screen.queryByText('Selected game')).not.toBeInTheDocument(),
    );
  });
});
