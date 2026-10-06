import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MouseEventHandler, PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
    onClick,
  }: PropsWithChildren<{
    className?: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }>) => (
    <a
      href="/"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        navigation.navigate();
      }}
    >
      {children}
    </a>
  ),
}));

import { GameSwitcher } from './game-switcher';

const games = Array.from({ length: 25 }, (_, index) => ({
  id: `game-${index}`,
  name: `Game ${index}`,
  deaths: 0,
  bossDeaths: 0,
  nonBossDeaths: null,
  killedBossCount: 0,
  bosses: [],
}));
it('keeps Live, Stats, and Music visible independently of the game count', () => {
  render(<GameSwitcher games={games} selectedGameId="music" />);
  expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
    'Live',
    'Stats',
    'Music',
  ]);
  expect(
    screen.getByRole('button', { name: /Choose game/ }),
  ).toBeInTheDocument();
  expect(screen.getByText('Music').closest('a')).toHaveClass(
    'text-primary-foreground',
  );
});
it('filters all games and navigates to a late-added game without horizontal scrolling', async () => {
  render(<GameSwitcher games={games} selectedGameId={null} />);
  fireEvent.click(screen.getByRole('button', { name: /Choose game/ }));
  fireEvent.change(
    await screen.findByRole('textbox', { name: 'Find a game' }),
    { target: { value: 'Game 24' } },
  );
  expect(
    screen.queryByRole('link', { name: 'Game 0' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Game 24' }));
  expect(navigation.navigate).toHaveBeenCalled();
  await waitFor(() =>
    expect(
      screen.queryByRole('textbox', { name: 'Find a game' }),
    ).not.toBeInTheDocument(),
  );
});
it('shows the selected game and a useful empty search state', async () => {
  render(<GameSwitcher games={games} selectedGameId="game-24" />);
  fireEvent.click(screen.getByRole('button', { name: /Game 24/ }));
  fireEvent.change(await screen.findByRole('textbox'), {
    target: { value: 'missing' },
  });
  expect(screen.getByText('No matching games')).toBeInTheDocument();
});
