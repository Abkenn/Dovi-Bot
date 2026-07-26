import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a
      href="/"
      className={className}
      onClick={(event) => {
        if (!event.defaultPrevented) {
          dependencies.navigate();
        }
        event.preventDefault();
      }}
    >
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

  it('keeps ordinary badge clicks available for navigation', () => {
    render(<GameSwitcher games={games} selectedGameId={null} />);

    fireEvent.click(screen.getByText('Dark Souls III'));

    expect(dependencies.navigate).toHaveBeenCalledOnce();
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

  it('hides the native scrollbar and converts mouse-wheel input to horizontal scrolling', () => {
    render(<GameSwitcher games={games} selectedGameId={null} />);
    const navigation = screen.getByRole('navigation', { name: 'Game stats' });

    fireEvent.wheel(navigation, { deltaY: 40 });

    expect(navigation).toHaveClass('game-switcher-scroll');
    expect(navigation.scrollLeft).toBe(40);

    fireEvent.wheel(navigation, { deltaX: 20, deltaY: 5 });
    expect(navigation.scrollLeft).toBe(60);
    fireEvent.wheel(navigation, { deltaX: 0, deltaY: 0 });
    expect(navigation.scrollLeft).toBe(60);
  });

  it('supports pointer dragging without activating a dragged game link', () => {
    render(<GameSwitcher games={games} selectedGameId={null} />);
    const navigation = screen.getByRole('navigation', { name: 'Game stats' });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    const hasPointerCapture = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    navigation.setPointerCapture = setPointerCapture;
    navigation.releasePointerCapture = releasePointerCapture;
    navigation.hasPointerCapture = hasPointerCapture;

    fireEvent.pointerMove(navigation, { clientX: 80, pointerId: 1 });
    fireEvent.pointerDown(navigation, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(navigation, { clientX: 70, pointerId: 1 });
    fireEvent.pointerUp(navigation, { clientX: 70, pointerId: 1 });

    expect(setPointerCapture).toHaveBeenCalled();
    expect(releasePointerCapture).toHaveBeenCalled();
    expect(navigation.scrollLeft).toBe(30);

    fireEvent.click(screen.getByText('Dark Souls III'));
    fireEvent.pointerDown(navigation, { clientX: 70, pointerId: 2 });
    fireEvent.pointerCancel(navigation, { clientX: 70, pointerId: 2 });
  });
});
