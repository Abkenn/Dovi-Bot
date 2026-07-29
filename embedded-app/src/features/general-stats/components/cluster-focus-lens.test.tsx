import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameComparison } from '@/live-stats.types';
import { ClusterFocusLens } from './cluster-focus-lens';

const makeGame = (
  id: string,
  name: string,
  attempts: number,
  seconds: number,
): GameComparison => ({
  id,
  name,
  defeatedBossCount: 3,
  averageDeathsPerBoss: attempts - 1,
  averageAttemptsPerBoss: attempts,
  averageWinningAttemptSeconds: seconds,
  difficultyScore: attempts * seconds,
  bossHighlights: {
    mostAttempts: {
      name: `${name} boss`,
      attempts,
      winningAttemptSeconds: seconds,
    },
    longestWinningAttempt: null,
    toughestOverall: null,
  },
});

describe('ClusterFocusLens', () => {
  it('renders nothing for an empty cluster', () => {
    const { container } = render(
      <ClusterFocusLens games={[]} onGameSelect={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps every expanded game hoverable, focusable, and selectable', () => {
    const onGamePreview = vi.fn();
    const onGameSelect = vi.fn();
    const games = [
      makeGame('bloodborne', 'Bloodborne', 4, 290),
      makeGame('lies-of-p', 'Lies of P', 4.4, 220),
      makeGame('sekiro', 'Sekiro', 4, 170),
    ];

    render(
      <ClusterFocusLens
        games={games}
        onGamePreview={onGamePreview}
        onGameSelect={onGameSelect}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: '3 nearby games' }),
    ).toBeInTheDocument();
    const liesOfP = screen.getByRole('button', { name: /Lies of P/ });

    fireEvent.mouseEnter(liesOfP);
    expect(onGamePreview).toHaveBeenLastCalledWith(games[1]);
    expect(screen.getByText('4.4 attempts')).toBeInTheDocument();
    expect(screen.getByText('3m 40s winning attempt')).toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: /Sekiro/ }));
    expect(onGamePreview).toHaveBeenLastCalledWith(games[2]);

    fireEvent.click(liesOfP);
    expect(onGameSelect).toHaveBeenCalledWith(games[1]);
  });
});
