import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a href="/" className={className}>
      {children}
    </a>
  ),
}));

import { GameSwitcher } from './game-switcher';

const games = [
  {
    id: 'ds3',
    name: 'Dark Souls III',
    deaths: 130,
    killedBossCount: 20,
    killedBosses: [],
  },
  {
    id: 'elden-ring',
    name: 'Elden Ring',
    deaths: 200,
    killedBossCount: 40,
    killedBosses: [],
  },
];

describe('GameSwitcher', () => {
  it('offers live and archived game navigation', () => {
    render(<GameSwitcher games={games} selectedGameId="ds3" />);

    expect(
      screen.getByRole('navigation', { name: 'Game stats' }),
    ).toBeVisible();
    expect(screen.getByText('Live')).toBeVisible();
    expect(screen.getByText('Dark Souls III')).toBeVisible();
    expect(screen.getByText('Elden Ring')).toBeVisible();
  });

  it('highlights live stats when no archived game is selected', () => {
    render(<GameSwitcher games={games} selectedGameId={null} />);

    expect(screen.getByText('Live').closest('a')).toHaveClass(
      'text-primary-foreground',
    );
    expect(screen.getByText('Dark Souls III').closest('a')).not.toHaveClass(
      'text-primary-foreground',
    );
  });
});
