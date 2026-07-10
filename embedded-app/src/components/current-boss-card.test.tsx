import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentBossCard } from './current-boss-card';

vi.mock('../hooks/use-elapsed-seconds', () => ({
  useElapsedSeconds: () => 83,
}));

describe('CurrentBossCard', () => {
  it('shows live boss deaths, attempt, and timer', () => {
    render(
      <CurrentBossCard
        boss={{
          name: 'Vordt',
          status: 'ACTIVE',
          deaths: 3,
          attemptNumber: 4,
          attemptStartedAt: '2026-07-10T18:00:00.000Z',
          pausedAt: null,
          pauseReason: null,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Vordt' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1:23')).toBeInTheDocument();
  });

  it('renders an intentional empty state', () => {
    render(<CurrentBossCard boss={null} />);
    expect(
      screen.getByRole('heading', { name: 'Waiting for tracking' }),
    ).toBeInTheDocument();
  });
});
