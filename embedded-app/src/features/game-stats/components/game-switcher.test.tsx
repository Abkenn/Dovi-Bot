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
    bossDeaths: 130,
    nonBossDeaths: null,
    killedBossCount: 20,
    bosses: [],
  },
  {
    id: 'elden-ring',
    name: 'Elden Ring',
    deaths: 200,
    bossDeaths: 200,
    nonBossDeaths: null,
    killedBossCount: 40,
    bosses: [],
  },
];

describe('GameSwitcher', () => {
  it('offers live, general stats, and archived game navigation', () => {
    render(<GameSwitcher games={games} selectedGameId="ds3" />);

    expect(
      screen.getByRole('navigation', { name: 'Game stats' }),
    ).toBeVisible();
    expect(screen.getByText('Live')).toBeVisible();
    expect(screen.getByText('Stats')).toBeVisible();
    expect(screen.getByText('Dark Souls III')).toBeVisible();
    expect(screen.getByText('Elden Ring')).toBeVisible();
  });

  it('highlights the general stats page between live and games', () => {
    render(<GameSwitcher games={games} selectedGameId="stats" />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Live',
      'Stats',
      'Dark Souls III',
      'Elden Ring',
    ]);
    expect(screen.getByText('Stats').closest('a')).toHaveClass(
      'text-primary-foreground',
    );
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
