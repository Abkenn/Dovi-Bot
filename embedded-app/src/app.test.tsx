import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { useLiveStats } from './hooks/use-live-stats';

vi.mock('./hooks/use-live-stats', () => ({ useLiveStats: vi.fn() }));
vi.mock('./pages/live-stats-page', () => ({
  LiveStatsPage: () => <main>Dashboard</main>,
}));

describe('App', () => {
  it('shows loading state', () => {
    vi.mocked(useLiveStats).mockReturnValue({
      stats: null,
      error: null,
      loading: true,
    });
    render(<App />);
    expect(screen.getByText(/Waking up live stats/)).toBeInTheDocument();
  });

  it('shows errors', () => {
    vi.mocked(useLiveStats).mockReturnValue({
      stats: null,
      error: 'Unavailable',
      loading: false,
    });
    render(<App />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('renders the dashboard', () => {
    vi.mocked(useLiveStats).mockReturnValue({
      stats: { game: null, currentBoss: null, killedBosses: [] },
      error: null,
      loading: false,
    });
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
