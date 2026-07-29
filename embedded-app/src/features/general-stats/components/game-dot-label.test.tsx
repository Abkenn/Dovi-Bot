import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameComparison } from '@/live-stats.types';
import { GameDotLabel } from './game-dot-label';

const games = [
  {
    id: 'lies-of-p',
    name: 'Lies of P',
    defeatedBossCount: 1,
    averageDeathsPerBoss: 3,
    averageAttemptsPerBoss: 4,
    averageWinningAttemptSeconds: 220,
    difficultyScore: 1,
    bossHighlights: {
      mostAttempts: {
        name: 'Boss',
        attempts: 4,
        winningAttemptSeconds: 220,
      },
      longestWinningAttempt: null,
      toughestOverall: null,
    },
  },
  {
    id: 'nine-sols',
    name: 'Nine Sols',
    defeatedBossCount: 1,
    averageDeathsPerBoss: 9,
    averageAttemptsPerBoss: 10,
    averageWinningAttemptSeconds: 210,
    difficultyScore: 2,
    bossHighlights: {
      mostAttempts: {
        name: 'Boss',
        attempts: 10,
        winningAttemptSeconds: 210,
      },
      longestWinningAttempt: null,
      toughestOverall: null,
    },
  },
] satisfies GameComparison[];

describe('GameDotLabel', () => {
  it('renders an interactive chart label pill', () => {
    const onGameEnter = vi.fn();
    const onGameLeave = vi.fn();
    const onGameSelect = vi.fn();
    const { rerender } = render(
      <svg role="img" aria-label="Test chart">
        <GameDotLabel
          games={games}
          index={0}
          value="Lies of P"
          x={100}
          y={80}
          onGameEnter={onGameEnter}
          onGameLeave={onGameLeave}
          onGameSelect={onGameSelect}
        />
      </svg>,
    );

    expect(screen.getByText('Lies of P')).toHaveAttribute('x', '100');
    expect(screen.getByText('Lies of P')).toHaveAttribute('y', '61');
    expect(document.querySelector('line')).toHaveAttribute('x1', '100');
    expect(document.querySelector('line')).toHaveAttribute('x2', '100');
    expect(document.querySelector('rect')).toBeInTheDocument();

    const label = screen.getByRole('button', { name: 'Lies of P' });
    fireEvent.mouseEnter(label);
    fireEvent.mouseLeave(label);
    fireEvent.focus(label);
    fireEvent.blur(label);
    fireEvent.keyDown(label, { key: 'Escape' });
    fireEvent.keyDown(label, { key: ' ' });
    fireEvent.click(label);
    expect(onGameEnter).toHaveBeenCalledTimes(2);
    expect(onGameLeave).toHaveBeenCalledTimes(2);
    expect(onGameSelect).toHaveBeenCalledTimes(2);

    rerender(
      <svg role="img" aria-label="Test chart">
        <GameDotLabel
          games={games}
          index={1}
          value="Nine Sols"
          x={120}
          y={90}
        />
      </svg>,
    );
    expect(screen.getByText('Nine Sols')).toHaveAttribute('x', '120');
    expect(document.querySelector('line')).toHaveAttribute('y1', '98');

    rerender(
      <svg role="img" aria-label="Test chart">
        <GameDotLabel />
      </svg>,
    );
    expect(screen.queryByText('Lies of P')).not.toBeInTheDocument();
  });

  it('collapses nearby labels into one cluster target', () => {
    const onClusterEnter = vi.fn();
    const onClusterLeave = vi.fn();
    const onClusterSelect = vi.fn();
    const cluster = { id: games[0].id, games };
    const { rerender } = render(
      <svg role="img" aria-label="Test chart">
        <GameDotLabel
          games={games}
          clusters={[cluster]}
          index={0}
          value="Lies of P"
          onClusterEnter={onClusterEnter}
          onClusterLeave={onClusterLeave}
          onClusterSelect={onClusterSelect}
        />
      </svg>,
    );

    const target = screen.getByRole('button', {
      name: 'Explore 2 nearby games',
    });
    fireEvent.mouseEnter(target);
    fireEvent.mouseLeave(target);
    fireEvent.keyDown(target, { key: 'Enter' });
    expect(screen.getByText('2 games')).toBeInTheDocument();
    expect(onClusterEnter).toHaveBeenCalledWith(cluster);
    expect(onClusterLeave).toHaveBeenCalledOnce();
    expect(onClusterSelect).toHaveBeenCalledWith(cluster);

    rerender(
      <svg role="img" aria-label="Test chart">
        <GameDotLabel
          games={games}
          clusters={[cluster]}
          index={1}
          value="Nine Sols"
        />
      </svg>,
    );
    expect(screen.queryByText('Nine Sols')).not.toBeInTheDocument();
  });
});
