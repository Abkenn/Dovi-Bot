import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchivedGamePage } from './archived-game-page';

vi.mock('@/features/game-stats/components/game-switcher', () => ({
  GameSwitcher: () => <div>Game switcher</div>,
}));
vi.mock('@/components/boss-history', () => ({
  BossHistory: () => <div>Boss history</div>,
}));
describe('ArchivedGamePage', () => {
  it('shows archived totals and game history', () => {
    const game = {
      id: 'ds3',
      name: 'Dark Souls III',
      deaths: 130,
      bossDeaths: 100,
      nonBossDeaths: 30,
      killedBossCount: 20,
      bosses: [{ name: 'Iudex Gundyr', deaths: 6, outcome: 'KILLED' as const }],
    };

    render(<ArchivedGamePage game={game} games={[game]} />);

    expect(screen.getByRole('heading', { name: 'Dark Souls III' })).toHaveClass(
      'activity-compact:!text-xl',
    );
    const totals = within(
      screen.getByRole('region', { name: 'Archived game totals' }),
    );
    expect(totals.getByLabelText('130')).toHaveClass(
      'activity-compact:!text-xl',
    );
    expect(totals.getByLabelText('20')).toBeInTheDocument();
    expect(totals.getByLabelText('100')).toBeInTheDocument();
    expect(totals.getByLabelText('30')).toBeInTheDocument();
    expect(totals.getByText('Boss deaths')).toBeInTheDocument();
    expect(totals.getByText('Non-boss deaths')).toBeInTheDocument();
    expect(screen.getByText('Game switcher')).toBeInTheDocument();
    expect(screen.getByText('Boss history')).toBeInTheDocument();
    expect(screen.getByText('Dovi Archived Stats')).toBeInTheDocument();
    expect(screen.getByText('Complete history')).toBeInTheDocument();
    expect(screen.getByText('Game switcher').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByText('Boss history').parentElement).toHaveClass(
      'activity-compact:hidden',
    );
    expect(screen.getByRole('main')).toHaveClass(
      'activity-compact:flex',
      'activity-compact:justify-center',
      'mobile-pip-frame',
    );
    expect(screen.getByRole('main')).not.toHaveAttribute('style');
  });

  it('marks archived totals as incomplete without a tracked game total', () => {
    const game = {
      id: 'ds2',
      name: 'Dark Souls II',
      deaths: 84,
      bossDeaths: 84,
      nonBossDeaths: null,
      killedBossCount: 3,
      bosses: [],
    };

    render(<ArchivedGamePage game={game} games={[game]} />);

    const totals = within(
      screen.getByRole('region', { name: 'Archived game totals' }),
    );
    expect(totals.getByText('84+')).toBeInTheDocument();
    expect(totals.getByText('Not tracked')).toBeInTheDocument();
  });
});
