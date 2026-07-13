import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchivedGamePage } from './archived-game-page';

vi.mock('../components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));
vi.mock('../components/boss-history', () => ({
  BossHistory: () => <div>Boss history</div>,
}));

describe('ArchivedGamePage', () => {
  it('shows archived totals and game history', () => {
    const game = {
      id: 'ds3',
      name: 'Dark Souls III',
      deaths: 130,
      killedBossCount: 20,
      killedBosses: [{ name: 'Iudex Gundyr', deaths: 6 }],
    };

    render(<ArchivedGamePage game={game} games={[game]} />);

    expect(
      screen.getByRole('heading', { name: 'Dark Souls III' }),
    ).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Game switcher')).toBeInTheDocument();
    expect(screen.getByText('Boss history')).toBeInTheDocument();
  });
});
